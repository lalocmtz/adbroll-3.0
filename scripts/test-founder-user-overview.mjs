const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create table profiles(id uuid primary key,full_name text,referral_code_used text);
create table affiliates(user_id uuid primary key,ref_code text unique);
create table affiliate_codes(code text primary key,user_id uuid);
create table subscriptions(user_id uuid,status text,price_usd numeric,stripe_subscription_id text,renew_at timestamptz);
create table creator_program_applications(user_id uuid,status text,subscription_ends_at timestamptz);
create function public.has_role(id uuid,r text) returns boolean language sql stable as $$select id='00000000-0000-0000-0000-000000000001'::uuid and r='founder'$$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,created_at)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@example.com',case when n<=6 then now() end,jsonb_build_object('full_name','Person '||n),now()-n*interval '1 minute' from generate_series(1,1005)n;
insert into profiles select id,'Person '||split_part(email,'@',1),case when email in('user2@example.com','user3@example.com','user4@example.com','user5@example.com') then 'LALO' end from auth.users;
insert into affiliates values('00000000-0000-0000-0000-000000000001','LALO'),('00000000-0000-0000-0000-000000000002','READY');
insert into affiliate_codes values('LALO','00000000-0000-0000-0000-000000000001'),('OLDLALO','00000000-0000-0000-0000-000000000001'),('READY','00000000-0000-0000-0000-000000000002');
update profiles set referral_code_used='OLDLALO' where id='00000000-0000-0000-0000-000000000002';
insert into subscriptions values
('00000000-0000-0000-0000-000000000002','active',29,'sub_paid',now()+interval '30 days'),
('00000000-0000-0000-0000-000000000002','active',29,'sub_duplicate',now()+interval '30 days'),
('00000000-0000-0000-0000-000000000003','active',0,'promo_invitation',now()+interval '30 days'),
('00000000-0000-0000-0000-000000000004','active',29,'sub_expired',now()-interval '1 day'),
('00000000-0000-0000-0000-000000000005','trialing',29,'sub_trial',now()+interval '30 days'),
('00000000-0000-0000-0000-000000000006','past_due',29,'sub_failed',now()+interval '30 days');
insert into creator_program_applications values('00000000-0000-0000-0000-000000000007','active',now()+interval '1 day'),('00000000-0000-0000-0000-000000000008','active',now()-interval '1 day'),('00000000-0000-0000-0000-000000000009','approved',null);
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261010110000_founder_user_overview.sql',import.meta.url),'utf8'));
const call=async(search='',filter='all',offset=0,limit=25)=>(await db.query('select public.get_founder_user_overview($1,$2,$3,$4) as result',[search,filter,offset,limit])).rows[0].result;
await db.exec('set role anon');
await assert.rejects(call(),/permission denied/);
await db.exec('reset role; set role authenticated');
await assert.rejects(call(),/Not authorized/);
await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)`);
await assert.rejects(call(),/Not authorized/);
await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)`);
const full=await call();
assert.deepEqual(full.stats,{registered:1005,email_confirmed:6,paid_active:1,complimentary_active:3,affiliate_codes:2,active_affiliates:1});
assert.equal(full.total,1005);assert.equal(full.rows.length,25);assert.equal(full.rows[0].referrals_registered,4);assert.equal(full.rows[0].referrals_paid_active,1);
const last=await call('','all',1000);assert.equal(last.rows.length,5);assert.equal(last.stats.registered,1005);
const paid=await call('','paid');assert.equal(paid.total,1);assert.equal(paid.rows[0].access_kind,'paid');
assert.equal((await call('','unconfirmed')).total,999);
assert.equal((await call('laLO','active_affiliates')).rows[0].ref_code,'LALO');
assert.equal((await call('','ready_affiliates')).rows[0].ref_code,'READY');
assert.equal((await call('%')).total,0); // Search treats wildcards literally.
assert.equal((await call('','all',0,100000)).rows.length,100);
assert.equal((await call('user4@example.com')).rows[0].access_kind,'unsubscribed');
assert.equal((await call('user5@example.com')).rows[0].access_kind,'trial');
assert.equal((await call('user7@example.com')).rows[0].access_kind,'complimentary');
assert.equal((await call('user8@example.com')).rows[0].access_kind,'unsubscribed');
assert.equal((await call('user9@example.com')).rows[0].access_kind,'unsubscribed');
await assert.rejects(call('','arbitrary'),/Invalid filter/);
console.log('PASS: founder-only access, >1000 global aggregates, distinct paid users, expiry/trial/promo separation, referral attribution, search and pagination');
await db.close();
