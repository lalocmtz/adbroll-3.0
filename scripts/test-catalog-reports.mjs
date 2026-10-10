const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create table products(id uuid primary key,producto_nombre text,imagen_url text,total_ingresos_mxn numeric,commission numeric,price numeric,precio_mxn numeric,categoria text,revenue_30d numeric,producto_url text);
create table videos(id uuid primary key,video_url text,video_mp4_url text,thumbnail_url text,title text,creator_name text,creator_handle text,creator_id uuid,product_name text,product_id uuid references products(id),sales integer,revenue_mxn numeric,views integer,roas numeric,category text,country text,rank integer,imported_at timestamptz,processing_status text,snapshot_date_range text,transcript text);
insert into products(id,producto_nombre,commission)values('00000000-0000-0000-0000-000000000099','test',10);
insert into videos(id,product_id,video_mp4_url,country,rank,revenue_mxn,snapshot_date_range,transcript)values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000099','owned.mp4','mx',1,300,'2026-09-10~2026-10-09','premium');`);
await db.exec(await readFile(new URL('../supabase/migrations/20261010070000_preserve_catalog_report_metrics.sql', import.meta.url),'utf8'));
await db.exec(`update videos set rank=null; update videos set rank=1,revenue_mxn=70,snapshot_date_range='2026-10-03~2026-10-09';`);
let rows=(await db.query('select * from video_report_metrics order by snapshot_date_range')).rows;
assert.equal(rows.length,2);assert.equal(Number(rows[0].revenue_mxn),300);assert.equal(rows[0].rank,1);assert.equal(Number(rows[1].revenue_mxn),70);
for(const [period,expected]of[['2026-09-10~2026-10-09',300],['2026-10-03~2026-10-09',70]]){
 const x=(await db.query(`select get_catalog_videos('mx',$1,'revenue') as result`,[period])).rows[0].result;
 assert.equal(x.count,1);assert.equal(x.rows[0].revenue_mxn,expected);assert.equal(x.rows[0].transcript,undefined);
}
const missing=(await db.query(`select get_catalog_videos('mx','2026-08-11~2026-10-09') as result`)).rows[0].result;assert.equal(missing.count,0);
await db.exec(`insert into videos(id,product_id,video_mp4_url,country,rank,revenue_mxn,snapshot_date_range) select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000099','owned.mp4','mx',n,100+n,'2026-09-10~2026-10-09' from generate_series(2,26)n;`);
const page=(await db.query(`select get_catalog_videos('mx','2026-09-10~2026-10-09','revenue',null,null,null,20) as result`)).rows[0].result;assert.equal(page.count,26);assert.equal(page.rows.length,6);
const videoCols=(await db.query(`select column_name from information_schema.columns where table_name='videos' and column_name<>'transcript'`)).rows.map(x=>x.column_name).join(',');
await db.exec(`grant usage on schema public to anon;grant select(${videoCols}) on videos to anon;grant select on products to anon;set role anon;`);
const anon=(await db.query(`select get_catalog_videos('mx','2026-09-10~2026-10-09') as result`)).rows[0].result;assert.equal(anon.count,26);assert.equal(anon.rows[0].transcript,undefined);
await assert.rejects(db.query('select transcript from videos'));
console.log('PASS: independent windows, rank reset preservation, exact metrics, pagination, column paywall');await db.close();

// Import/link regressions use a separate disposable schema to isolate report tests.
const links = new PGlite();
await links.exec(`
create role anon;create role authenticated;create role service_role;
create table products(id uuid primary key default gen_random_uuid(),tiktok_product_id text unique,market text,producto_nombre text,precio_mxn numeric,total_ventas integer,total_ingresos_mxn numeric,identity_status text default 'catalog',legacy_original_name text,updated_at timestamptz,last_import timestamptz,last_imported_from_kalodata_at timestamptz);
create table videos(id uuid primary key default gen_random_uuid(),tiktok_video_id text unique,video_url text unique,tiktok_product_id text,country text,product_id uuid references products(id),product_price numeric,product_sales integer,product_revenue numeric,manual_match boolean default false,match_status text,match_method text,match_source text,match_confidence numeric,match_algorithm_version text,creator_id uuid,creator_name text,creator_handle text,imported_at timestamptz,snapshot_at timestamptz,snapshot_date_range text,revenue_mxn numeric);
create table creators(id uuid primary key,nombre_completo text,country text,usuario_creador text);
create table imports(file_name text,market text,kind text,date_range text,total_rows integer,new_rows integer,updated_rows integer,videos_imported integer,products_imported integer,creators_imported integer,failed_rows integer,finished_at timestamptz,published_at timestamptz);
`);
await links.exec(await readFile(new URL('../supabase/migrations/20261010100000_refresh_exact_product_links.sql',import.meta.url),'utf8'));
const productA='00000000-0000-0000-0000-000000000001',productB='00000000-0000-0000-0000-000000000002';
await links.query(`insert into products(id,tiktok_product_id,market,producto_nombre,identity_status) values($1,'111111','mx','Source A','video_source'),($2,'222222','mx','Catalog B','catalog')`,[productA,productB]);
await links.query(`insert into videos(tiktok_video_id,video_url,country,tiktok_product_id,product_id,match_method,product_price,product_sales,product_revenue,revenue_mxn) values('1234567890123456789','https://www.tiktok.com/@x/video/1234567890123456789','mx','111111',$1,'tiktok_product_id',10,20,200,999)`,[productA]);
const importer=async(kind,rows)=>(await links.query(`select import_kalodata_rows($1,'mx','2026-09-10~2026-10-09','fixture.xlsx',$2::jsonb) as result`,[kind,JSON.stringify(rows)])).rows[0].result;
const readVideo=async(id='1234567890123456789')=>(await links.query('select * from videos where tiktok_video_id=$1',[id])).rows[0];
await importer('products',[{tiktok_product_id:'111111',market:'mx',producto_nombre:'Source A',identity_status:'video_source',precio_mxn:null,total_ventas:null,total_ingresos_mxn:null}]);
let linkedVideo=await readVideo();
assert.equal(linkedVideo.product_price,null);assert.equal(linkedVideo.product_sales,null);assert.equal(linkedVideo.product_revenue,null);assert.equal(Number(linkedVideo.revenue_mxn),999);
await importer('products',[{tiktok_product_id:'111111',market:'mx',producto_nombre:'Source A',identity_status:'catalog',precio_mxn:30,total_ventas:40,total_ingresos_mxn:1200}]);
linkedVideo=await readVideo();
assert.equal(linkedVideo.product_id,productA);assert.equal(Number(linkedVideo.product_price),30);assert.equal(linkedVideo.product_sales,40);assert.equal(Number(linkedVideo.product_revenue),1200);
await links.query(`insert into videos(tiktok_video_id,video_url,country,tiktok_product_id,product_id,manual_match,product_price,product_sales,product_revenue) values('1234567890123456790','manual','mx','999999',$1,true,99,88,77)`,[productA]);
await importer('videos',[{tiktok_video_id:'1234567890123456789',video_url:'https://www.tiktok.com/@x/video/1234567890123456789',country:'mx',tiktok_product_id:'999999'}]);
linkedVideo=await readVideo();
assert.equal(linkedVideo.product_id,null);assert.equal(linkedVideo.product_price,null);assert.equal(linkedVideo.product_sales,null);assert.equal(linkedVideo.product_revenue,null);assert.equal(linkedVideo.match_status,'identified_outside_catalog');assert.equal(Number(linkedVideo.revenue_mxn),999);
const manualVideo=await readVideo('1234567890123456790');
assert.equal(manualVideo.product_id,productA);assert.equal(Number(manualVideo.product_price),99);assert.equal(manualVideo.product_sales,88);assert.equal(Number(manualVideo.product_revenue),77);
await importer('videos',[{tiktok_video_id:'1234567890123456789',video_url:'https://www.tiktok.com/@x/video/1234567890123456789',country:'mx',tiktok_product_id:'222222'}]);
assert.equal((await readVideo()).product_id,productB);
await links.exec('set role authenticated');
await assert.rejects(importer('videos',[{tiktok_video_id:'1234567890123456789',country:'mx'}]),/permission denied/);
console.log('PASS: source-only null metrics, catalog promotion refresh, stale unmatched SKU clearing, manual preservation, exact relink and service-only import');
await links.close();
