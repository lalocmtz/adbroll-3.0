"""Build an atomic MX-only import; run dry-run first. No network writes."""
import json
from pathlib import Path
root=Path('/tmp/tokxray-launch-20260919')
payload=json.loads((root/'payload.json').read_text())
summary=json.loads((root/'summary.json').read_text())
period=summary['snapshot']; batch='mx-20260919-20260820-20260918'
parts=["BEGIN; SET LOCAL statement_timeout = '90s'; SELECT pg_advisory_xact_lock(20260919);"]
for kind,rows in payload.items():
    data=json.dumps(rows,ensure_ascii=False,separators=(',',':'))
    assert '$kalodata$' not in data
    parts.append(f'CREATE TEMP TABLE incoming_{kind} ON COMMIT DROP AS SELECT * FROM jsonb_populate_recordset(null::public.{kind}, $kalodata${data}$kalodata$::jsonb);')
parts.append(f"""
DO $$ BEGIN
 IF (SELECT count(*) FROM incoming_videos)<>2000 OR (SELECT count(*) FROM incoming_products)<>200 OR (SELECT count(*) FROM incoming_creators)<>2000 THEN RAISE EXCEPTION 'Incomplete input'; END IF;
 IF EXISTS(SELECT 1 FROM public.imports WHERE file_name='{batch}') THEN RAISE EXCEPTION 'Snapshot already imported'; END IF;
 IF EXISTS(SELECT 1 FROM public.products p JOIN incoming_products s USING(tiktok_product_id) WHERE p.market IS DISTINCT FROM 'mx') OR EXISTS(SELECT 1 FROM public.videos p JOIN incoming_videos s ON p.tiktok_video_id=s.tiktok_video_id OR p.video_url=s.video_url WHERE p.country IS DISTINCT FROM 'mx') OR EXISTS(SELECT 1 FROM public.creators p JOIN incoming_creators s ON lower(ltrim(p.usuario_creador,'@'))=s.usuario_creador WHERE p.country IS DISTINCT FROM 'mx') THEN RAISE EXCEPTION 'Cross-market identity conflict; inspect before import'; END IF;
 IF EXISTS(SELECT s.tiktok_video_id FROM incoming_videos s JOIN public.videos v ON v.tiktok_video_id=s.tiktok_video_id OR v.video_url=s.video_url GROUP BY s.tiktok_video_id HAVING count(*)>1) THEN RAISE EXCEPTION 'Ambiguous legacy video identity'; END IF;
 IF EXISTS(SELECT s.usuario_creador FROM incoming_creators s JOIN public.creators c ON lower(ltrim(c.usuario_creador,'@'))=s.usuario_creador GROUP BY s.usuario_creador HAVING count(*)>1) THEN RAISE EXCEPTION 'Ambiguous creator identity'; END IF;
 IF EXISTS(SELECT 1 FROM public.daily_rankings WHERE market='mx' AND ranking_date='2026-09-19') THEN RAISE EXCEPTION 'A ranking already exists for this day'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS tokxray_maintenance;
CREATE TABLE IF NOT EXISTS tokxray_maintenance.snapshot_backups(batch text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL);
INSERT INTO tokxray_maintenance.snapshot_backups(batch,payload)
SELECT '{batch}',jsonb_build_object('videos',(SELECT jsonb_agg(v) FROM public.videos v WHERE country='mx'),'products',(SELECT jsonb_agg(p) FROM public.products p WHERE market='mx'),'creators',(SELECT jsonb_agg(c) FROM public.creators c WHERE country='mx'));
-- Distinct product IDs must remain distinct even when names coincide.
UPDATE incoming_products s SET legacy_original_name=s.producto_nombre,producto_nombre=s.producto_nombre||' [ID:'||s.tiktok_product_id||']'
WHERE EXISTS(SELECT 1 FROM public.products p WHERE p.producto_nombre=s.producto_nombre AND p.market='mx' AND p.tiktok_product_id IS DISTINCT FROM s.tiktok_product_id)
 OR EXISTS(SELECT 1 FROM incoming_products d WHERE d.producto_nombre=s.producto_nombre AND d.tiktok_product_id<>s.tiktok_product_id);
""")
for kind,rows in payload.items():
    cols=list(rows[0])
    extra={'creators':['updated_at','last_import','last_imported_from_kalodata_at'], 'products':['updated_at','last_import','last_imported_from_kalodata_at','legacy_original_name'], 'videos':['imported_at','snapshot_at']}[kind]
    values={c:('s.legacy_original_name' if c=='legacy_original_name' else 'now()') for c in extra}
    match={'creators':"lower(ltrim(p.usuario_creador,'@'))=s.usuario_creador",'products':'p.tiktok_product_id=s.tiktok_product_id','videos':'(p.tiktok_video_id=s.tiktok_video_id OR p.video_url=s.video_url)'}[kind]
    sets=','.join(f'{c}=s.{c}' for c in cols)+','+','.join(f'{c}={v}' for c,v in values.items())
    parts.append(f'UPDATE public.{kind} p SET {sets} FROM incoming_{kind} s WHERE {match};')
    parts.append(f'INSERT INTO public.{kind}({",".join(cols+extra)}) SELECT {",".join("s."+c for c in cols)},{",".join(values.values())} FROM incoming_{kind} s WHERE NOT EXISTS(SELECT 1 FROM public.{kind} p WHERE {match});')
parts.append(f"""
UPDATE public.videos v SET rank=NULL WHERE country='mx' AND NOT EXISTS(SELECT 1 FROM incoming_videos s WHERE s.tiktok_video_id=v.tiktok_video_id);
UPDATE public.products p SET rank=NULL WHERE market='mx' AND NOT EXISTS(SELECT 1 FROM incoming_products s WHERE s.tiktok_product_id=p.tiktok_product_id);
UPDATE public.videos v SET creator_id=c.id,creator_name=c.nombre_completo FROM public.creators c,incoming_videos s WHERE v.tiktok_video_id=s.tiktok_video_id AND c.country='mx' AND lower(ltrim(c.usuario_creador,'@'))=s.creator_handle;
-- Recompute only this snapshot; retain explicit manual decisions.
UPDATE public.videos v SET product_id=p.id,match_status=CASE WHEN p.id IS NULL THEN 'identified_outside_catalog' ELSE 'matched' END,match_method=CASE WHEN p.id IS NOT NULL THEN 'tiktok_product_id' ELSE NULL END,match_confidence=CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END,match_source=CASE WHEN p.id IS NOT NULL THEN 'exact' ELSE 'none' END,match_algorithm_version='v6-id-only',product_price=p.precio_mxn,product_sales=p.total_ventas,product_revenue=p.total_ingresos_mxn
FROM incoming_videos s LEFT JOIN public.products p ON p.tiktok_product_id=s.tiktok_product_id AND p.market='mx'
WHERE v.tiktok_video_id=s.tiktok_video_id AND coalesce(v.manual_match,false)=false;
INSERT INTO public.daily_rankings(market,ranking_date,rank,video_id,tiktok_video_id,snapshot_date_range)
SELECT 'mx','2026-09-19',s.rank,v.id,s.tiktok_video_id,'{period}' FROM incoming_videos s JOIN public.videos v USING(tiktok_video_id);
INSERT INTO public.product_snapshots(product_id,revenue_30d,gmv_30d_mxn,creators_count,total_ventas,commission,rank)
SELECT p.id,s.revenue_30d,s.gmv_30d_mxn,s.creators_count,s.total_ventas,s.commission,s.rank FROM incoming_products s JOIN public.products p USING(tiktok_product_id);
INSERT INTO public.imports(file_name,market,total_rows,videos_imported,products_imported,creators_imported,failed_rows,finished_at,date_range,kind,published_at)
VALUES('{batch}','mx',4200,2000,200,2000,0,now(),'{period}','snapshot',now());
DO $$ BEGIN
 IF (SELECT count(*) FROM public.videos WHERE country='mx' AND rank IS NOT NULL)<>2000 THEN RAISE EXCEPTION 'Video rank verification failed'; END IF;
 IF (SELECT count(*) FROM public.products WHERE market='mx' AND rank IS NOT NULL)<>200 THEN RAISE EXCEPTION 'Product rank verification failed'; END IF;
END $$;
SELECT 'verified' AS result,2000 AS imported_videos,200 AS imported_products,2000 AS imported_creators,
(SELECT count(*) FROM public.videos WHERE country='mx' AND rank IS NOT NULL AND product_id IS NOT NULL) AS linked_videos,
(SELECT count(*) FROM public.videos WHERE country='mx' AND rank IS NOT NULL AND nullif(trim(video_mp4_url),'') IS NOT NULL) AS videos_with_media,
(SELECT count(*) FROM incoming_products WHERE legacy_original_name IS NOT NULL) AS names_disambiguated;
""")
sql='\n'.join(parts)
(root/'snapshot-dry-run.sql').write_text(sql+'\nROLLBACK;\n')
(root/'snapshot-apply.sql').write_text(sql+'\nCOMMIT;\n')
print('Prepared atomic import, bytes:',len(sql.encode()))
# Smaller requests for the Lovable connector's 1 MB limit. These stage data only;
# they never change the public catalog. The final transaction validates all counts.
import re
stage_root=root/'staging'
stage_root.mkdir(exist_ok=True)
(stage_root/'00-setup.sql').write_text("CREATE SCHEMA IF NOT EXISTS tokxray_maintenance; CREATE TABLE IF NOT EXISTS tokxray_maintenance.import_rows(batch text NOT NULL,kind text NOT NULL,natural_id text NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(batch,kind,natural_id)); REVOKE ALL ON tokxray_maintenance.import_rows FROM PUBLIC,anon,authenticated;\n")
index=1
for kind,key in [('creators','creator_handle'),('products','tiktok_product_id'),('videos','tiktok_video_id')]:
    for offset in range(0,len(payload[kind]),100):
        data=json.dumps(payload[kind][offset:offset+100],ensure_ascii=False,separators=(',',':'))
        assert '$kalodata$' not in data
        query=f"INSERT INTO tokxray_maintenance.import_rows(batch,kind,natural_id,payload) SELECT '{batch}','{kind}',item->>'{key}',item FROM jsonb_array_elements($kalodata${data}$kalodata$::jsonb) item ON CONFLICT(batch,kind,natural_id) DO UPDATE SET payload=EXCLUDED.payload; SELECT kind,count(*) AS staged_rows FROM tokxray_maintenance.import_rows WHERE batch='{batch}' GROUP BY kind;\n"
        (stage_root/f'{index:02d}-{kind}.sql').write_text(query)
        index+=1
pattern=r'CREATE TEMP TABLE incoming_(creators|products|videos) ON COMMIT DROP AS SELECT \* FROM jsonb_populate_recordset\(null::public\.\1, \$kalodata\$[\s\S]*?\$kalodata\$::jsonb\);'
staged=re.sub(pattern,lambda m:f"CREATE TEMP TABLE incoming_{m[1]} ON COMMIT DROP AS SELECT * FROM jsonb_populate_recordset(null::public.{m[1]},(SELECT jsonb_agg(payload) FROM tokxray_maintenance.import_rows WHERE batch='{batch}' AND kind='{m[1]}'));",sql)
assert len(staged)<30000
(root/'snapshot-staged-dry-run.sql').write_text(staged+'\nROLLBACK;\n')
(root/'snapshot-staged-apply.sql').write_text(staged+'\nCOMMIT;\n')
