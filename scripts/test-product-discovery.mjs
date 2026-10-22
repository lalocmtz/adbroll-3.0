// Runs against a disposable in-memory PostgreSQL. Never connects to production.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-product-discovery.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
let assertions = 0;
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const rejects = async (sql, regex = /permission denied/) => { await assert.rejects(db.query(sql), regex); assertions++; };
const scalar = async (sql, params=[]) => (await db.query(sql,params)).rows[0].result;
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
grant usage on schema public to anon,authenticated,service_role;
create table products(id uuid primary key default gen_random_uuid(), tiktok_product_id text unique, producto_nombre text,
  producto_url text,imagen_url text,categoria text,market text,currency text,identity_status text default 'catalog',is_hidden boolean,
  rank integer,precio_mxn numeric,price numeric,commission numeric,commission_amount numeric,total_ventas integer,
  total_ingresos_mxn numeric,revenue_30d numeric,creators_count integer,rating numeric,report_date_range text);
create table videos(id uuid primary key default gen_random_uuid(),product_id uuid references products(id),country text,
  tiktok_product_id text,video_mp4_url text,manual_match boolean,analysis_ready boolean,transcript text,analysis_json jsonb);
create table kalodata_report_rows(kind text,market text,report_date_range text,source_id text,payload jsonb,
  published_at timestamptz,primary key(kind,market,report_date_range,source_id));
alter table kalodata_report_rows enable row level security;
grant all on kalodata_report_rows,products,videos to service_role;
grant select on products to anon,authenticated;
grant select(id,product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready) on videos to anon,authenticated;
insert into products(tiktok_product_id,producto_nombre,market,currency,categoria,rank,commission,revenue_30d,report_date_range)
select (1000+n)::text,case when n=1105 then 'Cilíndro Café' else 'Producto '||n end,'mx','MXN',
  case when n%2=0 then 'Hogar' else 'Belleza' end,case when n<=500 then n end,n%20,n*10,
  case when n<=500 then '2026-09-21~2026-10-20' else '2026-09-10~2026-10-09' end from generate_series(1,1105)n;
insert into products(tiktok_product_id,producto_nombre,market,identity_status,is_hidden,revenue_30d,commission,rank)
values('9001','Fuente video','mx','video_source',false,999999,100,1),('9002','Oculto','mx','catalog',true,999999,100,1),
 ('9003','Producto duplicado','mx','legacy_duplicate',false,999999,100,1),('9004','Producto US','us','catalog',false,99,10,1);
insert into videos(product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready,transcript,analysis_json)
select id,'mx',tiktok_product_id,'owned.mp4',false,true,'premium secret','{"secret":true}' from products where tiktok_product_id in ('1001','9001');
insert into videos(product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready)
select id,'mx','99999','owned.mp4',false,true from products where tiktok_product_id='1001';
insert into videos(product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready)
select id,'mx','99998','manual.mp4',true,false from products where tiktok_product_id='1001';
insert into videos(product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready)
select id,'us',tiktok_product_id,'cross-market.mp4',false,true from products where tiktok_product_id='1001';
insert into videos(product_id,country,tiktok_product_id,video_mp4_url,manual_match,analysis_ready)
select id,'mx',tiktok_product_id,'  ',false,true from products where tiktok_product_id='1001';
`);
const period = '2026-09-21~2026-10-20';
const shop = (id,name,rank,date=period) => ({shop_id:id,shop_name:name,rank,market:'mx',source_row:{
  'Rango de fechas':date,'Ingresos(M$)':12345.67,'Ventas':120,'Tipo de vendedor':'Marca',
  'Precio medio por unidad (M$)':102.88,'Ingresos por vídeos(M$)':8000,'Ingresos en vivo(M$)':3000,
  'Ingresos de la Ficha de Producto':1345.67,'Ingresos por afiliados (M$)':9500}});
for (const row of [shop('123456','Tienda Café',1),shop('987654','Otra tienda',2)]) {
  await db.query('insert into kalodata_report_rows values($1,$2,$3,$4,$5,null)', ['shops','mx',period,row.shop_id,JSON.stringify(row)]);
}
await db.exec(await readFile(new URL('../supabase/migrations/20261022021559_product_discovery.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20261022021742_product_discovery_links.sql',import.meta.url),'utf8'));
const rpc = async (query=null,sort='ranking',extra={}) => scalar(`select search_catalog_products('mx',$1,$2,$3,$4,$5,$6,$7,$8) as result`,
  [query,sort,extra.category??null,extra.hasVideos??false,extra.commission??null,extra.shopId??null,extra.offset??0,extra.limit??20]);
for (const role of ['anon','authenticated']) {
  await db.exec('set role '+role);
  let result=await rpc();
  eq(result.count,500,'default ranking contains current report only'); eq(result.rows.length,20); eq(result.current_period,period);
  eq(result.rows[0].tiktok_product_id,'1001'); eq(result.rows[0].available_video_count,2,'reject mismatched links, market and blank files');
  eq(result.rows[0].analysis_ready_count,1); eq(result.categories,['Belleza','Hogar']);
  eq(JSON.stringify(result).includes('premium secret'),false); eq(JSON.stringify(result).includes('analysis_json'),false);
  result=await rpc('producto','revenue_30d',{offset:1000,limit:100});
  eq(result.count,1104,'server search is not truncated at 1000'); eq(result.rows.length,100); eq(new Set(result.rows.map(x=>x.id)).size,100);
  result=await rpc('cILINDRO cafe'); eq(result.count,1);eq(result.rows[0].tiktok_product_id,'2105');eq(result.rows[0].is_current_report,false);
  eq((await rpc('2105')).rows[0].tiktok_product_id,'2105');
  eq((await rpc('https://www.tiktok.com/view/product/2105?foo=bar')).count,1);
  eq((await rpc('https://www.tiktok.com/shop/pdp/2105')).count,1);
  eq((await rpc('https://www.tiktok.com/shop/pdp/cilindro-cafe/2105?source=share')).count,1);
  eq((await rpc('https://www.tiktok.com/shop/pdp/2105garbage')).count,0);
  eq((await rpc('https://www.tiktok.com/view/product/2105garbage')).count,0);
  eq((await rpc('https://www.kalodata.com/product/detail?id=2105&region=MX')).count,1);
  eq((await rpc('https://evil.example/product/2105')).count,0);
  eq((await rpc('%')).count,0,'percent is a literal');eq((await rpc('_')).count,0,'underscore is a literal');
  eq((await rpc('oculto')).count,0);eq((await rpc('9003')).count,0);eq((await rpc('9004')).count,0);
  eq((await rpc(null,'revenue_30d')).count,1105,'all complete historical cards are searchable');
  result=await rpc('Fuente video');eq(result.count,1);eq(result.rows[0].identity_status,'video_source');
  eq(result.rows[0].commission,null);eq(result.rows[0].revenue_30d,null);eq(result.rows[0].rank,null);
  eq((await rpc(null,'ranking',{hasVideos:true})).count,1);
  result=await rpc(null,'commission',{category:'Hogar',commission:15});
  assert(result.rows.every(x=>x.commission>=15&&x.categoria==='Hogar'));assertions++;
  eq((await rpc('', 'garbage')).count,500);eq((await rpc('', 'ranking',{limit:10000})).rows.length,100);
  const id=(await rpc('2105')).rows[0].id;
  result=await scalar('select get_catalog_product($1,$2) as result',['mx',id]);eq(result.tiktok_product_id,'2105');
  eq(await scalar('select get_catalog_product($1,$2) as result',['us',id]),null);
  result=await scalar("select get_catalog_shops('mx') as result");eq(result.count,2);eq(result.rows[0].shop_name,'Tienda Café');
  eq(result.rows[0].verified_product_count,0);eq(result.rows[0].available_video_count,0);eq(result.rows[0].revenue,12345.67);
  eq((await scalar("select get_catalog_shops('mx','cafe') as result")).count,1);
  eq((await scalar("select get_catalog_shops('us') as result")).count,0);
  eq((await rpc(null,'revenue_30d',{shopId:'123456'})).count,0,'no fabricated product links');
  eq(await scalar("select get_catalog_shop('mx','nope') as result"),null);
  await rejects('select transcript from videos');await rejects('select * from kalodata_report_rows');
  await rejects("select publish_catalog_shops_from_report('mx','2026-09-21~2026-10-20')");
  await rejects("insert into catalog_shops(market,shop_id,shop_name,report_date_range) values('mx','5','fake','2026-09-21~2026-10-20')");
  await rejects("delete from catalog_shop_products");
  await db.exec('reset role');
}
await db.exec(`insert into catalog_shop_products(market,shop_id,product_id,source_tiktok_product_id,source_url)
  select 'mx','123456',id,tiktok_product_id,'https://www.kalodata.com/shop/detail?id=123456' from products where tiktok_product_id='1001'`);
await rejects(`insert into catalog_shop_products(market,shop_id,product_id,source_tiktok_product_id,source_url)
  select 'mx','123456',id,'1001','https://source' from products where tiktok_product_id='1002'`,/identity or market mismatch/);
await rejects(`insert into catalog_shop_products(market,shop_id,product_id,source_tiktok_product_id,source_url)
  select 'mx','123456',id,tiktok_product_id,'https://source' from products where tiktok_product_id='9004'`,/identity or market mismatch/);
await db.exec('set role anon');
eq((await rpc(null,'revenue_30d',{shopId:'123456'})).rows[0].tiktok_product_id,'1001');
let result=await scalar("select get_catalog_shop('mx','123456') as result");eq(result.verified_product_count,1);eq(result.available_video_count,2);
await db.exec('reset role; update catalog_shops set is_hidden=true where shop_id=\'123456\'; set role anon');
eq(await scalar("select get_catalog_shop('mx','123456') as result"),null);eq((await rpc(null,'revenue_30d',{shopId:'123456'})).count,0);
await db.exec('reset role; update catalog_shops set is_hidden=false');
const newer='2026-09-22~2026-10-21';
await db.query('insert into kalodata_report_rows values($1,$2,$3,$4,$5,null)',['shops','mx',newer,'123456',JSON.stringify(shop('123456','Tienda actualizada',1,newer))]);
await db.exec('set role service_role');
result=await scalar('select publish_catalog_shops_from_report($1,$2) as result',['mx',newer]);eq(result.published,1);
await scalar('select publish_catalog_shops_from_report($1,$2) as result',['mx',newer]);
await scalar('select publish_catalog_shops_from_report($1,$2) as result',['mx',period]);
await db.exec('reset role; set role anon');
result=await scalar("select get_catalog_shops('mx') as result");eq(result.count,1);eq(result.rows[0].shop_name,'Tienda actualizada');eq(result.current_period,newer);
await db.exec('reset role');eq(await scalar('select count(*)::integer as result from catalog_shop_reports'),3,'reimport preserves independent snapshots without duplicate or sum');
eq(await scalar("select count(*)::integer as result from kalodata_report_rows where published_at is not null"),3);
// Re-publication of malformed source is atomic: no partial name/metrics writes.
await db.query(`update kalodata_report_rows set payload=jsonb_set(payload,'{source_row,Ingresos(M$)}','"NaN"') where report_date_range=$1`,[newer]);
await rejects(`select publish_catalog_shops_from_report('mx','${newer}')`,/Invalid shop metric/);
eq(await scalar("select revenue::text as result from catalog_shop_reports where report_date_range='2026-09-22~2026-10-21'"),'12345.67');
await rejects("select publish_catalog_shops_from_report('mx','2026-02-30~2026-03-29')",/date\/time|Invalid shop report/);
await rejects("select publish_catalog_shops_from_report('mx','2026-09-21~2026-10-21')",/Invalid shop report/);
if (process.env.SHOPS_SOURCEFILE) {
  const raw=JSON.parse(await readFile(process.env.SHOPS_SOURCEFILE,'utf8'));
  await db.exec('truncate catalog_shop_products,catalog_shop_reports,catalog_shops,kalodata_report_rows');
  for(const [index,source] of raw.shops.entries()) {
    const shopId=new URL(source['Enlace de Kalodata']).searchParams.get('id');
    const data={shop_id:shopId,shop_name:source['Nombre de la tienda'],market:'mx',rank:index+1,source_row:source};
    await db.query('insert into kalodata_report_rows values($1,$2,$3,$4,$5,null)',
      ['shops','mx',source['Rango de fechas'],shopId,JSON.stringify(data)]);
  }
  const realPeriod=raw.shops[0]['Rango de fechas'];
  result=await scalar('select publish_catalog_shops_from_report($1,$2) as result',['mx',realPeriod]);
  eq(result.published,raw.shops.length);
  await scalar('select publish_catalog_shops_from_report($1,$2) as result',['mx',realPeriod]);
  await db.exec('set role anon');
  result=await scalar("select get_catalog_shops('mx',null,0,100) as result");
  eq(result.count,raw.shops.length);eq(result.rows.length,raw.shops.length);
  eq(result.rows[0].shop_name,raw.shops[0]['Nombre de la tienda']);
  eq(result.rows[0].revenue,raw.shops[0]['Ingresos(M$)']);
  eq(result.rows[0].total_sales,raw.shops[0]['Ventas']);
  eq(result.rows.every(s=>s.verified_product_count===0),true);
  eq(result.rows.some(s=>'source_row' in s),false);
  await db.exec('reset role');
  console.log(`PASS real export: ${raw.shops.length} shops, ${realPeriod}, exact metrics and zero invented product associations.`);
}
console.log(`PASS ${assertions} assertions: pagination beyond 1000, literal/accent/ID/URL search, current periods, source nulls, exact links, RLS/read-only/paywall, shop snapshots and atomic validation.`);
await db.close();
