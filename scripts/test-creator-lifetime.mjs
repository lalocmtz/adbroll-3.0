const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create table profiles(id uuid primary key,full_name text,referral_code_used text);
create table affiliates(user_id uuid primary key,ref_code text unique);
create table affiliate_codes(code text primary key,user_id uuid);
create table subscriptions(user_id uuid,status text,price_usd numeric,stripe_subscription_id text,renew_at timestamptz);
create table user_roles(user_id uuid,role text);
create function public.has_role(id uuid,r text) returns boolean language sql stable as $$select id='00000000-0000-0000-0000-000000000001'::uuid and r='founder'$$;
create table creator_program_applications(id uuid primary key default gen_random_uuid(),email text unique,full_name text,whatsapp text,tiktok_url text,video_url text,status text default 'pending_video',grant_code text unique,granted_days integer default 30,user_id uuid,approved_by uuid,approved_at timestamptz,subscription_starts_at timestamptz,subscription_ends_at timestamptz,notes text,created_at timestamptz default now(),updated_at timestamptz default now());
grant all on creator_program_applications to anon,authenticated;
create function generate_grant_code() returns text language sql as $$ select 'CREATOR-'||upper(substr(gen_random_uuid()::text,1,8)) $$;
insert into auth.users(id,email,email_confirmed_at) select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.com',case when n<>4 then now() end from generate_series(1,9)n;
insert into user_roles values('00000000-0000-0000-0000-000000000001','founder');
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261013050418_creator_lifetime_access.sql',import.meta.url),'utf8'));
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const login = async n => { await db.exec('reset role;set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid(n)]); };
const videos = ['https://www.tiktok.com/@creator/video/123','https://www.instagram.com/reel/abc/','https://www.youtube.com/shorts/xyz'];
const submit=async(urls=videos,consent=true)=>(await db.query('select submit_creator_lifetime_application($1,$2,$3,$4,$5) as result',['Creator Name','2213267653','https://www.tiktok.com/@creator',urls,consent])).rows[0].result;
const review=async(id,approve=true)=>(await db.query('select review_creator_lifetime_application($1,$2) as result',[id,approve])).rows[0].result;
const redeem=async code=>(await db.query('select redeem_creator_access($1) as result',[code])).rows[0].result;
const paid=async n=>(await db.query('select is_paid_user($1) as result',[uid(n)])).rows[0].result;
await db.exec('set role anon'); await assert.rejects(submit(),/permission denied/);
await login(4); await assert.rejects(submit(),/Confirma tu correo/);
await login(2);
await assert.rejects(submit([videos[0],videos[0]+'?tracking=1',videos[1]]),/tres enlaces/);
await assert.rejects(submit([videos[0],videos[1],'https://tiktok.com.evil.test/@a/video/123']),/tres enlaces/);
await assert.rejects(submit(videos,false),/autorizar/);
await assert.rejects(()=>db.exec("insert into creator_program_applications(email,status) values('fake@example.com','active')"),/permission denied/);
const app=await submit(); assert.equal(app.status,'pending_review');
await assert.rejects(()=>db.exec("update creator_program_applications set status='active'"),/permission denied/);
await assert.rejects(()=>review(app.id),/Not authorized/);
await assert.rejects(()=>paid(2),/permission denied/);
await login(1); const approved=await review(app.id);assert.equal(approved.status,'active');assert.equal(approved.access_kind,'lifetime');
assert.deepEqual(await review(app.id),approved); // Retry is idempotent.
await login(3);await assert.rejects(()=>redeem(approved.grant_code),/Código no disponible/);
await login(2);assert.equal((await redeem(approved.grant_code)).access_kind,'lifetime');await assert.rejects(submit(),/ya fue aprobado/);
await db.exec('reset role');assert.equal(await paid(2),true);
const row=(await db.query('select * from creator_program_applications where id=$1',[app.id])).rows[0];
assert.equal(row.subscription_ends_at,null); assert.equal(row.approved_by,uid(1)); assert.equal(row.user_id,uid(2));
assert.ok(row.ad_permission_at); assert.ok(new Date(row.ad_license_ends_at)>new Date(row.approved_at));
assert.equal((await db.query('select count(*)::int as n from subscriptions')).rows[0].n,0); // Grants never fabricate paid subscriptions.
await db.query(`insert into creator_program_applications(email,user_id,status,grant_code,granted_days) values('user3@example.com',$1,'approved','CREATOR-LEGACY',30)`,[uid(3)]);
assert.equal(await paid(3),false); // Unredeemed null-expiry legacy grant is not forever.
await login(3);const legacy=await redeem('CREATOR-LEGACY');assert.equal(legacy.access_kind,'limited');assert.ok(legacy.subscription_ends_at);
assert.deepEqual(await redeem('CREATOR-LEGACY'),legacy); // No renewal/extension on repeated redemption.
await db.exec('reset role');assert.equal(await paid(3),true);
await db.query("update creator_program_applications set subscription_ends_at=now()-interval '1 day' where user_id=$1",[uid(3)]);assert.equal(await paid(3),false);
await login(3);await assert.rejects(()=>redeem('CREATOR-LEGACY'),/ya no está disponible/);await db.exec('reset role');
await db.query("update creator_program_applications set subscription_ends_at=null where user_id=$1",[uid(3)]);assert.equal(await paid(3),false);
await db.query("update creator_program_applications set status='rejected' where user_id=$1",[uid(2)]);assert.equal(await paid(2),false);
await db.query("update creator_program_applications set status='active' where user_id=$1",[uid(2)]);
await login(1); const overview=(await db.query('select get_founder_user_overview() as result')).rows[0].result;
assert.equal(overview.rows.find(r=>r.id===uid(2)).access_kind,'complimentary');
assert.equal(overview.rows.find(r=>r.id===uid(3)).access_kind,'unsubscribed');
await login(5);const rejected=await submit();await login(1);await review(rejected.id,false);await login(5);assert.equal((await submit()).status,'pending_review');
await login(6);await assert.rejects(()=>db.query('select grant_creator_preview($1,$2)',['user6@example.com',7]),/Not authorized/);
await login(1);
await assert.rejects(()=>db.query('select grant_creator_preview($1,$2)',['user4@example.com',7]),/confirmar ese correo/);
await assert.rejects(()=>db.query('select grant_creator_preview($1,$2)',['user6@example.com',31]),/1 a 30/);
await assert.rejects(()=>db.query('select grant_creator_preview($1,$2)',['user2@example.com',7]),/ya tiene acceso vitalicio/);
await db.query('select grant_creator_preview($1,$2)',['USER6@example.com',7]);
await db.exec('reset role');assert.equal(await paid(6),true);
await login(6); const previewApp=await submit();await db.exec('reset role');assert.equal(await paid(6),true);
await login(1);await review(previewApp.id,false);await db.exec('reset role');assert.equal(await paid(6),true);
await db.query("update creator_program_applications set subscription_ends_at=now()-interval '1 day' where user_id=$1",[uid(6)]);assert.equal(await paid(6),false);
await login(6);await submit();await login(1);await review(previewApp.id);await db.exec('reset role');assert.equal(await paid(6),true);
// The capacity migration backfills already-approved lifetimes and permanently closes at 100.
// A previously revoked lifetime must also consume its original place.
await db.query("update creator_program_applications set status='rejected' where id=$1",[app.id]);
await db.exec(await readFile(new URL('../supabase/migrations/20261013134121_creator_lifetime_capacity_100.sql',import.meta.url),'utf8'));
const capacity=async()=>(await db.query('select get_creator_lifetime_capacity() as result')).rows[0].result;
assert.deepEqual(await capacity(),{limit:100,claimed:2,remaining:98,is_open:true});
await db.query("update creator_program_applications set status='active' where id=$1",[app.id]);
assert.equal((await capacity()).claimed,2);
await db.exec('set role anon');
assert.deepEqual(await capacity(),{limit:100,claimed:2,remaining:98,is_open:true});
await assert.rejects(()=>db.query('select * from creator_lifetime_places'),/permission denied/);
await assert.rejects(()=>db.query('select * from creator_lifetime_capacity_state'),/permission denied/);
await db.exec('reset role');
await db.exec(`insert into auth.users(id,email,email_confirmed_at) select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.com',now() from generate_series(10,110)n;`);
// Approved service writes must consume a place too; they cannot bypass the cap.
await db.exec(`insert into creator_program_applications(email,user_id,status,access_kind,approved_at)
  select email,id,'active','lifetime',now() from auth.users where email ~ '^user([1-9][0-9]|10[0-6])@' and id>='00000000-0000-0000-0000-000000000010'::uuid;`);
assert.deepEqual(await capacity(),{limit:100,claimed:99,remaining:1,is_open:true});
await login(107);const place100=await submit();
await login(108);const place101=await submit();
assert.equal((await capacity()).claimed,99); // Pending applications do not reserve a place.
await login(1);
await db.query('select grant_creator_preview($1,$2)',['user109@example.com',7]);
assert.equal((await capacity()).claimed,99); // Neither do invited previews.
const finalPlace=await review(place100.id);
assert.deepEqual(await capacity(),{limit:100,claimed:100,remaining:0,is_open:false});
assert.deepEqual(await review(place100.id),finalPlace); // Idempotency survives closure.
await assert.rejects(()=>review(place101.id),/Se agotaron los 100/);
await login(108);await assert.rejects(submit(),/Se agotaron los 100/);
await login(110);await assert.rejects(submit(),/Se agotaron los 100/);
await login(2);assert.equal((await redeem(approved.grant_code)).access_kind,'lifetime'); // Existing grants remain usable.
await db.exec('reset role');
await db.query("update creator_program_applications set status='rejected' where id=$1",[place100.id]);
assert.equal((await capacity()).claimed,100);assert.equal((await capacity()).is_open,false);
await db.query('delete from creator_program_applications where id=$1',[place100.id]);
assert.equal((await capacity()).claimed,100); // No FK cascade can release the durable place.
await assert.rejects(()=>db.exec('delete from creator_lifetime_places where place_number=100'),/permanentes/);
await assert.rejects(()=>db.exec('truncate creator_lifetime_places'),/permanentes/);
await assert.rejects(()=>db.exec('update creator_lifetime_capacity_state set claimed=99'),/solo puede avanzar/);
await db.exec('grant insert on creator_program_applications to service_role;set role service_role');
await assert.rejects(()=>db.query("insert into creator_program_applications(email,user_id,status,access_kind,approved_at) values('bypass@example.com',$1,'active','lifetime',now())",[uid(110)]),/Se agotaron los 100/);
await assert.rejects(()=>db.exec('delete from creator_lifetime_places'),/permission denied/);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::integer n from creator_lifetime_places')).rows[0].n,100);
assert.deepEqual(await capacity(),{limit:100,claimed:100,remaining:0,is_open:false});
console.log('PASS: durable capacity backfill, public aggregate without PII, 99/100/101 boundary, no pending/preview reservation, repeat approval/redemption, permanent closure after revocation/deletion, no counter reset, and service-write bypass prevention.');
console.log('PASS: verified email binding, 3 distinct URLs, ad consent, founder-only approval, denied direct writes, lifetime expiry semantics, legacy atomic redemption, repeat idempotency, revoked entitlement, founder overview and resubmission.');
await db.close();
