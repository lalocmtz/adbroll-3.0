// Disposable PostgreSQL-compatible execution. No production URL or credentials.
// PGLITE_MODULE=/tmp/tokxray-db-tests/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-affiliate-network.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,referral_code_used text,created_at timestamptz DEFAULT now());
CREATE TABLE affiliate_codes(user_id uuid UNIQUE,code text UNIQUE);
CREATE TABLE affiliates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid UNIQUE,ref_code text UNIQUE,usd_earned numeric DEFAULT 0,usd_available numeric DEFAULT 0,payout_hold boolean DEFAULT false,code_customized boolean DEFAULT false);
CREATE TABLE affiliate_payouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id_referred uuid,affiliate_code text,month text,amount_paid numeric,commission_affiliate numeric,commission_agency numeric,type text,stripe_invoice_id text,status text,created_at timestamptz DEFAULT now(),commission_reversed numeric NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX affiliate_payouts_invoice_once ON affiliate_payouts(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE TABLE subscriptions(user_id uuid,stripe_subscription_id text,status text,price_usd numeric);`);
for(const f of ['20261010040000_launch_commission_policy.sql','20261013050359_affiliate_network_v3.sql'])
 await db.exec(await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
const ids=Array.from({length:10},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const [leader,creator,buyer,ancestor,childCreator,childBuyer,other,legacyBuyer,smallBuyer]=ids;
for(const [i,id] of ids.entries()){
 await db.query('INSERT INTO profiles(id,email) VALUES($1,$2)',[id,`person${i}@example.test`]);
 await db.query('INSERT INTO affiliates(user_id,ref_code) VALUES($1,$2)',[id,`CODE${i}`]);
 await db.query('INSERT INTO affiliate_codes(user_id,code) VALUES($1,$2)',[id,`CODE${i}`]);
}
const as=uid=>scalar("SELECT set_config('test.uid',$1,false)",[uid]);
const join=(code,accept=true)=>scalar('SELECT join_affiliate_network($1,$2)',[code,accept]);
const credit=(who,code,invoice,cents=2900,type='recurring')=>scalar('SELECT record_affiliate_commission_v3($1,$2,$3,$4,$5)',[who,code,invoice,cents,type]);
const balance=uid=>scalar('SELECT usd_available FROM affiliates WHERE user_id=$1',[uid]).then(Number);
await db.exec('BEGIN');
const rejects=async(fn,match)=>{await db.exec('SAVEPOINT expected_error');await assert.rejects(fn,match);await db.exec('ROLLBACK TO SAVEPOINT expected_error');await db.exec('RELEASE SAVEPOINT expected_error');};
await as(creator);
await rejects(()=>join('CODE0',false),/Explicit acceptance/);
await rejects(()=>join('CODE1'),/Invalid leader/);
assert.equal((await join(' code0 ')).success,true);
assert.equal((await join('CODE0')).already_joined,true);
await rejects(()=>join('CODE6'),/already assigned/);
await as(leader);
assert.equal((await scalar("SELECT update_affiliate_code('NEWCODE')")).success,false);
await rejects(()=>join('CODE1'),/cycle/);
await join('CODE3');
await as(childCreator);await join('CODE1');
// No sign-up reward, including nested creators.
assert.equal(await balance(leader),0);
await db.query("UPDATE profiles SET referral_code_used='CODE1' WHERE id=$1",[buyer]);
assert.equal(await credit(buyer,'CODE0','wrong-code',2900,'initial'),null);
assert.equal(Number(await credit(buyer,'CODE1','first',2900,'initial')),10);
assert.equal(await credit(buyer,'CODE1','first',2900,'initial'),null);
assert.equal(await balance(creator),10);assert.equal(await balance(leader),0);
assert.equal(Number(await credit(buyer,'CODE1','renew')),4.35);
assert.equal(await balance(creator),14.35);assert.equal(await balance(leader),1.45);
assert.equal(await balance(ancestor),0);
assert.equal(await credit(buyer,'CODE1','renew'),null);
assert.equal(Number(await credit(buyer,'CODE1','resubscribe',2900,'reactivation')),4.35);
assert.equal(await balance(leader),1.45);
await db.query("UPDATE profiles SET referral_code_used='CODE4' WHERE id=$1",[childBuyer]);
await credit(childBuyer,'CODE4','child-first',2900,'initial');
await credit(childBuyer,'CODE4','child-renew');
assert.equal(await balance(leader),1.45); // No third hop.
assert.equal(await balance(creator),20.15); // direct18.70 + own one-hop1.45.
// Partial, repeated, out-of-order and full refund reverse BOTH recipients.
await scalar("SELECT reconcile_affiliate_refund('renew',1450,2900)");
assert.equal(await balance(leader),0.72);assert.equal(await balance(creator),17.97);
assert.equal(await scalar("SELECT reconcile_affiliate_refund('renew',1450,2900)"),false);
await scalar("SELECT reconcile_affiliate_refund('renew',2900,2900)");
await scalar("SELECT reconcile_affiliate_refund('renew',1450,2900)");
assert.equal(await balance(leader),0);assert.equal(await balance(creator),15.80);
await scalar("SELECT reconcile_affiliate_refund('first',2900,2900)");
assert.equal(Number(await credit(buyer,'CODE1','after-refund',2900,'initial')),4.35); // Cannot farm first bonuses.
await scalar("SELECT hold_affiliate_invoice('after-refund')");
assert.equal(await scalar('SELECT payout_hold FROM affiliates WHERE user_id=$1',[leader]),true);
assert.equal(await scalar('SELECT payout_hold FROM affiliates WHERE user_id=$1',[creator]),true);
// An upstream leader's own purchase cannot earn its indirect commission.
await db.query("UPDATE profiles SET referral_code_used='CODE1' WHERE id=$1",[leader]);
await credit(leader,'CODE1','self-indirect',2900,'recurring');assert.equal(await balance(leader),0);
// Freeze community selection after first paid sale.
await db.query("UPDATE profiles SET referral_code_used='CODE6' WHERE id=$1",[smallBuyer]);
assert.equal(Number(await credit(smallBuyer,'CODE6','small-first',500,'initial')),5);
await as(other);await rejects(()=>join('CODE0'),/before your first paid/);
// Prior policy preserved.
await db.query("UPDATE profiles SET referral_code_used='CODE1' WHERE id=$1",[legacyBuyer]);
assert.equal(Number(await scalar("SELECT record_affiliate_commission_v2($1,'CODE1','legacy',1500,'initial')",[legacyBuyer])),15);
assert.equal(await balance(leader),0);
await db.query("INSERT INTO subscriptions VALUES($1,'sub_live','active',29)",[buyer]);
await as(leader);
const network=await scalar('SELECT get_affiliate_network()');
assert.equal(network.direct_creators,1);assert.equal(network.indirect_creators,1);
assert.equal(network.indirect_active_customers,1);assert.equal(network.indirect_customers,2); // Buyer + legacy; leader self excluded.
assert.equal(network.members[0].email_masked,'p***@example.test');
assert.equal(network.leader.code,'CODE3');assert.equal(network.can_join,false);
assert.equal(network.indirect_earned,0);
await as(other);assert.equal((await scalar('SELECT get_affiliate_network()')).direct_creators,0);
assert.equal(await scalar("SELECT has_function_privilege('authenticated','record_affiliate_commission_v3(uuid,text,text,integer,text)','EXECUTE')"),false);
assert.equal(await scalar("SELECT has_function_privilege('anon','get_affiliate_network()','EXECUTE')"),false);
assert.equal(await scalar("SELECT has_function_privilege('anon','join_affiliate_network(text,boolean)','EXECUTE')"),false);
assert.equal(await scalar("SELECT has_table_privilege('authenticated','affiliate_network_memberships','INSERT')"),false);
await db.query("UPDATE profiles SET referral_code_used='CODE1' WHERE id=$1",[ids[9]]);
assert.equal(Number(await credit(ids[9],'CODE1','prior-nonreferred-reactivation',2900,'reactivation')),4.35);
assert.equal(await balance(leader),0);
assert.equal(await scalar("SELECT initial_reward FROM affiliate_payouts WHERE stripe_invoice_id='prior-nonreferred-reactivation'"),false);
await rejects(()=>credit(buyer,'CODE1','null-amount',null),/Invalid commission amount/);
await rejects(()=>scalar("SELECT reconcile_affiliate_refund('renew',NULL,2900)"),/Invalid refund/);
const beforeLegacyRefund=await balance(creator);
await scalar("SELECT reconcile_affiliate_refund('legacy',1500,1500)");
assert.equal(await balance(creator),beforeLegacyRefund-15);
assert.equal(Number(await scalar("SELECT count(*) FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl WHERE p.proname IN ('record_affiliate_commission_v3','join_affiliate_network','get_affiliate_network','hold_affiliate_invoice','reconcile_affiliate_refund','update_affiliate_code') AND acl.grantee=0 AND acl.privilege_type='EXECUTE'")),0);
await as('');await rejects(()=>scalar('SELECT get_affiliate_network()'),/Not authenticated/);
await db.exec('ROLLBACK');
assert.equal(Number(await scalar('SELECT count(*) FROM affiliate_network_memberships')),0);
assert.equal(Number(await scalar('SELECT count(*) FROM affiliate_payouts')),0);
console.log('PASS: v3 initial10, recurring15%+5%, one-hop only, idempotency, refund monotonicity both recipients, disputes hold both, consent/cycle/self checks, immutable attribution, historic v2 policy, masked private network counts, permissions, transaction rollback.');
await db.close();
