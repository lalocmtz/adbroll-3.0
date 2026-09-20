// Run with: PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/test-affiliate-ledger.mjs
// Uses a disposable local PostgreSQL-compatible engine; never connects to production.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,referral_code_used text,stripe_customer_id text,plan_tier text,created_at timestamptz DEFAULT now());
CREATE TABLE affiliate_codes(id uuid DEFAULT gen_random_uuid(),user_id uuid UNIQUE,code text UNIQUE);
CREATE TABLE affiliate_referrals(code_used text,referred_user_id uuid UNIQUE);
CREATE TABLE affiliates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid UNIQUE,ref_code text UNIQUE,usd_earned numeric DEFAULT 0,usd_available numeric DEFAULT 0,usd_withdrawn numeric DEFAULT 0,payouts_enabled boolean DEFAULT true,stripe_onboarding_complete boolean DEFAULT true,stripe_connect_id text DEFAULT 'acct_test',code_customized boolean DEFAULT false,last_payout_at timestamptz);
CREATE TABLE affiliate_payouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id_referred uuid,affiliate_code text,month text,amount_paid numeric,commission_affiliate numeric,commission_agency numeric,type text,stripe_invoice_id text,status text,created_at timestamptz DEFAULT now());
CREATE TABLE withdrawal_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),affiliate_id uuid,amount numeric,status text,stripe_transfer_id text,created_at timestamptz DEFAULT now());
CREATE TABLE subscriptions(user_id uuid,stripe_subscription_id text,status text,price_usd numeric);
CREATE FUNCTION generate_affiliate_code() RETURNS text LANGUAGE sql AS $$ SELECT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) $$;
`);
for (const file of [
 '20260919230000_affiliate_commission_atomic.sql','20260919231000_affiliate_dashboard_sources.sql','20260919232000_affiliate_payout_reservations.sql',
 '20260920000000_lock_referral_attribution.sql','20260920001000_affiliate_refund_adjustments.sql','20260920002000_affiliate_write_permissions.sql','20260920003000_protect_used_affiliate_codes.sql',
]) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
const owner='00000000-0000-4000-8000-000000000001', customer='00000000-0000-4000-8000-000000000002';
await db.query('INSERT INTO profiles(id) VALUES($1),($2)',[owner,customer]);
await db.query("INSERT INTO affiliate_codes(user_id,code) VALUES($1,'ALICIA')",[owner]);
await db.query("INSERT INTO affiliates(user_id,ref_code) VALUES($1,'ALICIA')",[owner]);
const scalar=async(sql,args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
const credit=(invoice,cents=3000)=>scalar("SELECT record_affiliate_commission($1,'ALICIA',$2,$3,'recurring')",[customer,invoice,cents]);
assert.equal(await credit('invoice1',1500),true);
assert.equal(await credit('invoice1',1500),false);
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),4.5);
assert.equal(await scalar('SELECT reserve_affiliate_payout(id) FROM affiliates'),null);
for(let i=2;i<=7;i++) await credit(`invoice${i}`);
const reservation=await scalar('SELECT reserve_affiliate_payout(id) FROM affiliates');
assert.equal(Number(reservation.amount),58.5);
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),0);
assert.equal((await scalar('SELECT reserve_affiliate_payout(id) FROM affiliates')).id,reservation.id);
await credit('invoice8');
assert.equal(await scalar('SELECT complete_affiliate_payout($1,$2)',[reservation.id,'tr_test']),true);
assert.equal(await scalar('SELECT complete_affiliate_payout($1,$2)',[reservation.id,'tr_test']),false);
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),9);
assert.equal(Number(await scalar('SELECT usd_withdrawn FROM affiliates')),58.5);
await scalar("SELECT reconcile_affiliate_refund('invoice8',1500,3000)");
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),4.5);
await scalar("SELECT reconcile_affiliate_refund('invoice8',1500,3000)");
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),4.5);
await scalar("SELECT reconcile_affiliate_refund('invoice8',3000,3000)");
await scalar("SELECT reconcile_affiliate_refund('invoice8',1500,3000)");
assert.equal(Number(await scalar('SELECT usd_available FROM affiliates')),0);
await db.query("SELECT set_config('test.uid',$1,false)",[customer]);
assert.equal(await scalar("SELECT apply_referral_code($1,'ALICIA')",[customer]),true);
await db.query("INSERT INTO affiliate_codes(user_id,code) VALUES($1,'OTHER')",['00000000-0000-4000-8000-000000000003']);
assert.equal(await scalar("SELECT apply_referral_code($1,'OTHER')",[customer]),false);
await assert.rejects(()=>scalar("SELECT apply_referral_code($1,'ALICIA')",[owner]),/Not authorized/);
await db.query("SELECT set_config('test.uid',$1,false)",[owner]);
assert.equal(await scalar("SELECT apply_referral_code($1,'ALICIA')",[owner]),false);
assert.equal((await scalar("SELECT update_affiliate_code('NEWCODE')")).success,false);
const dashboard=await scalar('SELECT get_affiliate_dashboard()');
assert.equal(dashboard.referrals.length,1);
assert.equal(Number(dashboard.usd_available),0);
await db.exec("UPDATE affiliates SET payout_hold=true,usd_available=100");
assert.equal(await scalar('SELECT reserve_affiliate_payout(id) FROM affiliates'),null);
assert.equal(await scalar("SELECT has_table_privilege('authenticated','affiliates','UPDATE')"),false);
console.log('PASS: migrations; discounted commission; invoice deduplication; $50 minimum; payout reservation/retry; concurrent new earnings; refund partial/full/reordered; attribution ownership/immutability; dashboard; dispute hold; client write restriction.');
await db.close();
