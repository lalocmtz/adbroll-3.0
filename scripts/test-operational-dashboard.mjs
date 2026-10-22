import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table user_roles(user_id uuid,role text);
create table storage.buckets(id text primary key);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,metadata jsonb);
create table videos(analysis_json jsonb);
create table catalog_analysis_jobs(status text,estimated_cost_usd numeric,updated_at timestamptz,lease_until timestamptz,last_error_code text);
create table catalog_analysis_settings(id boolean,enabled boolean,daily_attempt_limit int,max_concurrent int);
create table catalog_download_jobs(status text,failure_message text,updated_at timestamptz);
create table catalog_analysis_attempts(started_at timestamptz);
-- User subscription aggregation is provided by the existing, separately tested founder RPC.
create function get_founder_user_overview(text,text,int,int) returns jsonb language sql as $$select '{"stats":{"registered":0,"email_confirmed":0,"paid_active":0,"complimentary_active":0,"affiliate_codes":0,"active_affiliates":0},"rows":[{"email":"must-not-leak@example.com"}]}'::jsonb$$;
insert into catalog_analysis_settings values(true,true,200,2);
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261016210000_operational_dashboard.sql', import.meta.url), 'utf8'));
await db.exec('set role anon');
await assert.rejects(() => db.query('select get_operations_overview()'), /permission denied/);
await db.exec('set role authenticated');
await assert.rejects(() => db.query('select get_operations_overview()'), /Founder access/);
await db.exec('reset role');
const founder = '00000000-0000-4000-8000-000000000001';
await db.query("insert into user_roles values($1,'founder')", [founder]);
await db.query("select set_config('test.uid',$1,false)", [founder]);
await db.exec('set role authenticated');
const snapshot = async () => (await db.query('select get_operations_overview() s')).rows[0].s;
let s = await snapshot();
assert.equal(s.storage.fileBytes, 0);
assert.deepEqual(s.storage.buckets, []);
assert.equal(s.queue.remaining, 0);
assert.deepEqual(s.ai.models, []);
assert.equal(s.ai.balanceUsd, null);
assert.equal(s.attemptsToday, 0);
assert.equal(s.users.paid_active, 0);
assert.ok(!JSON.stringify(s).includes('must-not-leak'));
await assert.rejects(() => db.query('select * from storage.objects'), /permission denied/);
await db.exec('reset role');
await db.exec(`insert into storage.buckets values('videos'),('empty');
insert into storage.objects(bucket_id,metadata) values('videos','{"size":2048}'),('videos','{"size":"oops"}'),('videos','{}'),('videos','{"size":-5}');
insert into catalog_analysis_jobs values('ready',0.1,now(),null,null),('ready',null,now(),null,null),('ready',0.1,now()-interval '2 hours',null,null),('pending',null,now(),null,'retry'),('failed',null,now(),null,'error'),('running',null,now(),now()-interval '1 minute',null);
insert into catalog_download_jobs values('rejected','Descargas pausadas: se agotó el límite de uso del proveedor.',now()),('unknown','Needs review',now()),('ready','Sin saldo',now());
insert into catalog_analysis_attempts values(now()),(date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'-interval '1 second');`);
for (const cache of [
  {model:'gemini-3.5-flash-lite',usage:{promptTokenCount:10000,candidatesTokenCount:1500,thoughtsTokenCount:500}},
  {model:'unknown-new-model',usage:{promptTokenCount:10000,candidatesTokenCount:1500}},
  {model:'gemini-3.5-flash-lite',usage:{promptTokenCount:'invalid'}},
  {},
]) await db.query('insert into videos values($1)', [JSON.stringify({_cache:cache})]);
await db.exec('set role authenticated');
s = await snapshot();
assert.equal(s.storage.fileBytes, 2048);
assert.equal(s.storage.unknownSizes, 3);
assert.equal(s.storage.buckets.find(b => b.id === 'empty').objects, 0);
assert.equal(s.ai.models.find(m => m.model === 'gemini-3.5-flash-lite').estimated_usd, 0.008);
assert.equal(s.ai.models.find(m => m.model === 'unknown-new-model').estimated_usd, null);
assert.equal(s.ai.unmeteredAnalyses, 2);
assert.equal(s.queue.completed_last_hour, 1); // no imported legacy caches counted as fresh work
assert.equal(s.queue.remaining, 2);
assert.equal(s.queue.failed, 1);
assert.equal(s.queue.retrying, 1);
assert.equal(s.queue.expired_leases, 1);
assert.equal(s.attemptsToday, 1);
assert.equal(s.downloads.billingBlocked, 1);
assert.equal(s.downloads.unknown, 1);
assert.equal(s.downloads.rejected, 1);
assert.ok(!JSON.stringify(s).includes("Needs review"));
await db.query("select set_config('test.uid',$1,false)", ['00000000-0000-4000-8000-000000000002']);
await assert.rejects(() => snapshot(), /Founder access/);
// Apply the new ledger after the original dashboard to verify upgrade compatibility.
await db.exec('reset role');
await db.exec(await readFile(new URL('../supabase/migrations/20261016214500_ai_usage_ledger.sql', import.meta.url), 'utf8'));
await db.query("select set_config('test.uid',$1,false)", [founder]);
await db.exec('set role authenticated');
await assert.rejects(() => db.query('select * from ai_provider_usage'), /permission denied/);
await assert.rejects(() => db.query('select ai_provider_usage_summary()'), /permission denied/);
await assert.rejects(() => db.query("insert into ai_provider_usage(request_id,attempt,started_at,duration_ms,model,succeeded) values(gen_random_uuid(),1,now(),1,'model',true)"), /permission denied/);
let upgraded = await snapshot();
assert.equal(upgraded.providerUsage.attempts, 0);
assert.equal(upgraded.providerUsage.estimatedUsd, null);
assert.ok(upgraded.providerUsage.since);
assert.deepEqual(upgraded.ai, s.ai); // historical cache is separate, never added to ledger
await db.exec('set role service_role');
const group = '00000000-0000-4000-8000-000000000009';
await db.query("insert into ai_provider_usage(request_id,attempt,started_at,duration_ms,model,http_status,succeeded,error_code) values($1,1,now(),100,'gemini-3.5-flash-lite',503,false,'UNAVAILABLE')",[group]);
await db.query("insert into ai_provider_usage(request_id,attempt,started_at,duration_ms,model,http_status,succeeded,input_tokens,output_tokens,thinking_tokens,estimated_cost_usd,pricing_reference) values($1,2,now(),100,'gemini-3.5-flash-lite',200,true,10000,1500,500,0.008,'reference')",[group]);
await assert.rejects(() => db.query("insert into ai_provider_usage(request_id,attempt,started_at,duration_ms,model,succeeded) values($1,2,now(),1,'model',true)",[group]), /duplicate key/);
await db.exec('set role authenticated');
upgraded = await snapshot();
assert.equal(upgraded.providerUsage.attempts, 2);
assert.equal(upgraded.providerUsage.failed, 1);
assert.equal(upgraded.providerUsage.unpricedAttempts, 1);
assert.equal(upgraded.providerUsage.estimatedUsd, 0.008);
assert.equal(upgraded.providerUsage.models[0].output_tokens, 2000);
assert.deepEqual(upgraded.ai, s.ai);
assert.ok(!JSON.stringify(upgraded.providerUsage).includes(group));
await db.exec('set role anon');
await assert.rejects(() => db.query('select get_operations_overview()'), /permission denied/);
await db.close();
console.log('PASS operational dashboard: founder ACL, no user detail leak, empty aggregates, real storage sizes, invalid metadata, unknown model pricing, thinking tokens, observed throughput, UTC attempts');
