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
