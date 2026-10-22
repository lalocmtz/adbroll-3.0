#!/usr/bin/env python3
"""Audit a normalized refresh against a saved DB inventory; never call paid APIs.

Input folder: payload.json, before-{videos,products,creators}.json. The inventory
must be refreshed immediately before dispatching any prepared provider batch.
"""
import argparse
import csv
import importlib.util
import json
from collections import Counter
from pathlib import Path


def audit(folder):
    def read(name):
        return json.loads((folder / name).read_text())

    payload = read('payload.json')
    previous = {k: read(f'before-{k}.json') for k in ('videos', 'products', 'creators')}
    videos = {v['tiktok_video_id']: v for v in previous['videos'] if v['tiktok_video_id']}
    urls = {v['video_url']: v for v in previous['videos'] if v['video_url']}
    products = {p['tiktok_product_id']: p for p in previous['products'] if p['tiktok_product_id']}
    products_uuid = {p['id']: p for p in previous['products']}
    creators = {c['usuario_creador'].lstrip('@').lower(): c for c in previous['creators']}
    owned_prefix = 'https://tnqvvfpzkjwgllwdwvte.supabase.co/storage/v1/object/public/videos/'
    permanent = {'not_found', 'private', 'post_not_found_or_private', 'post_sensitive', 'download_unavailable'}
    missing, reused, blocked, new = [], [], [], []
    seen = set()
    for row in payload['videos']:
        key = row['tiktok_video_id']
        if key in seen:
            raise ValueError(f'Duplicate source video ID: {key}')
        seen.add(key)
        by_id, by_url = videos.get(key), urls.get(row['video_url'])
        if by_id and by_url and by_id['id'] != by_url['id']:
            raise ValueError(f'Ambiguous existing identity: {key}')
        old = by_id or by_url
        if old is None:
            new.append(row)
        if old and (old.get('video_mp4_url') or '').startswith(owned_prefix):
            reused.append(old)
        elif old and (old.get('processing_status') or '').lower() in permanent:
            blocked.append(row)
        else:
            missing.append(row)

    source_counts = Counter(v['tiktok_product_id'] for v in payload['videos'])
    ready_counts, stored_counts = Counter(), Counter()
    for v in previous['videos']:
        if not (v.get('video_mp4_url') or '').startswith(owned_prefix):
            continue
        key = (products_uuid.get(v.get('product_id'), {}).get('tiktok_product_id')
               if v.get('manual_match') else v.get('tiktok_product_id'))
        if key:
            stored_counts[key] += 1
            if v.get('analysis_ready'):
                ready_counts[key] += 1

    coverage = []
    for p in payload['products']:
        key = p['tiktok_product_id']
        coverage.append({
            'ranking': p['rank'], 'producto': p['producto_nombre'], 'id_producto': key,
            'ventas_mxn_reporte': p['total_ingresos_mxn'], 'comision_pct': p.get('commission'),
            'creadores_del_reporte': p.get('creators_count'),
            'videos_en_excel_nuevo': source_counts[key],
            'videos_reproducibles_historicos': stored_counts[key],
            'analisis_listos_historicos': ready_counts[key],
            'faltantes_para_5_en_reporte': max(0, 5 - source_counts[key]),
            'prioridad': ('1. Top 100 sin video en el lote' if p['rank'] <= 100 and not source_counts[key]
                         else '2. Top 100 con menos de 5' if p['rank'] <= 100 and source_counts[key] < 5
                         else '3. Sin video en el lote' if not source_counts[key]
                         else '4. Ampliar variedad'),
            'enlace_kalodata': f'https://www.kalodata.com/product/detail?id={key}',
            'enlace_tiktok': p['producto_url'],
        })
    creator_counts = Counter(v['creator_handle'] for v in payload['videos'])
    creator_coverage = [{
        'creador': c['usuario_creador'], 'nombre': c['nombre_completo'],
        'ventas_totales_mxn': c['total_ingresos_mxn'], 'ventas_videos_mxn': c['revenue_videos'],
        'ventas_live_mxn': c['revenue_live'], 'videos_en_excel_nuevo': creator_counts[c['creator_handle']],
    } for c in payload['creators']]
    summary = {
        'period': payload['videos'][0]['snapshot_date_range'],
        'rows': {k: len(v) for k, v in payload.items()},
        'new_videos': len(new), 'existing_videos': len(payload['videos']) - len(new),
        'reusable_mp4': len(reused), 'reusable_ready_analysis': sum(v['analysis_ready'] is True for v in reused),
        'missing_mp4': len(missing), 'blocked_do_not_retry': len(blocked),
        'new_products': sum(p['tiktok_product_id'] not in products for p in payload['products']),
        'source_products_completed': sum(products.get(p['tiktok_product_id'], {}).get('identity_status') == 'video_source' for p in payload['products']),
        'new_creators': sum(c['usuario_creador'] not in creators for c in payload['creators']),
        'unique_products_in_video_export': len(source_counts),
        'products_missing_from_product_export': len(set(source_counts) - {p['tiktok_product_id'] for p in payload['products']}),
        'products_without_new_report_video': sum(x['videos_en_excel_nuevo'] == 0 for x in coverage),
        'products_with_one_new_report_video': sum(x['videos_en_excel_nuevo'] == 1 for x in coverage),
        'products_with_5plus_new_report_videos': sum(x['videos_en_excel_nuevo'] >= 5 for x in coverage),
        'products_with_playable_history': sum(x['videos_reproducibles_historicos'] > 0 for x in coverage),
        'top100_without_new_report_video': sum(x['ranking'] <= 100 and x['videos_en_excel_nuevo'] == 0 for x in coverage),
        'top100_additional_to_reach_5': sum(x['faltantes_para_5_en_reporte'] for x in coverage if x['ranking'] <= 100),
    }
    (folder / 'audit-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    for name, rows in [('cobertura-productos', coverage), ('cobertura-creadores', creator_coverage)]:
        with (folder / f'{name}.csv').open('w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
    (folder / 'pending-downloads.json').write_text(json.dumps({'videos': missing}, ensure_ascii=False))
    (folder / 'blocked-downloads.json').write_text(json.dumps(blocked, ensure_ascii=False))
    spec = importlib.util.spec_from_file_location('batches', Path(__file__).with_name('prepare-video-download-batches.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    manifest, batches = module.prepare({'videos': missing}, limit=max(1, len(missing)))
    out = folder / 'descargas-pendientes'
    out.mkdir(exist_ok=True)
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    for n, batch in enumerate(batches, 1):
        (out / f'apify-{n:03}.json').write_text(json.dumps(batch, ensure_ascii=False, indent=2))
    assert len(missing) + len(reused) + len(blocked) == len(payload['videos'])
    assert not ({r['video_id'] for r in manifest} & {r['tiktok_video_id'] for r in reused})
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    print(json.dumps(audit(parser.parse_args().folder), ensure_ascii=False, indent=2))
