"""Read Kalodata exports, preserve string IDs and prepare a reviewed MX snapshot.

No network access or database writes. Contact exports remain local.
"""
import csv
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import openpyxl

SOURCE = Path('/Users/eduardo/Downloads')
OUT = Path('/Users/eduardo/Documents/ChatGPT/TOKXRAY/outputs/2026-10-10/importacion')
CONTACTS = OUT
OUT.mkdir(parents=True, exist_ok=True)
CONTACTS.mkdir(parents=True, exist_ok=True)

def read(name, sheet):
    p = SOURCE / name
    rows = list(openpyxl.load_workbook(p, read_only=True, data_only=True)[sheet].values)
    return [dict(zip(rows[0], row)) for row in rows[1:] if any(v is not None for v in row)]

def ident(url):
    u = urlparse(str(url or ''))
    value = parse_qs(u.query).get('id', [None])[0]
    if value: return value
    m = re.search(r'/(?:product|video)/(\d+)', u.path)
    return m.group(1) if m else None

def num(value):
    if value in (None, '', '-'): return 0
    return float(str(value).replace(',', '').replace('%', ''))

def seconds(value):
    s = str(value or '')
    return sum(int(n) * {'h':3600, 'm':60, 's':1}[unit] for n,unit in re.findall(r'(\d+)\s*([hms])', s))

files = {'creators':'Kalodata_Creator_20261010230433_MX.xlsx', 'products':'Kalodata_Product_20261010230357_MX.xlsx', 'videos':'Kalodata_Video_20261010230416_MX.xlsx'}
raw = {kind:read(name, 'LIST_'+ {'creators':'CREATOR','products':'PRODUCT','videos':'VIDEO'}[kind]) for kind,name in files.items()}
periods = {r['Rango de fechas'] for rows in raw.values() for r in rows}
assert len(periods) == 1, periods
period = next(iter(periods))
payload = {'creators':[], 'products':[], 'videos':[]}
for r in raw['creators']:
    handle = str(r['Usuario del creador']).strip().lstrip('@').lower()
    payload['creators'].append(dict(usuario_creador=handle,creator_handle=handle,nombre_completo=r['Nombre del creador'],country='mx',seguidores=int(num(r['Seguidores'])),total_videos=int(num(r['Número de vídeos'])),total_ventas=int(num(r['Ventas'])),total_ingresos_mxn=num(r['Ingresos(M$)']),revenue_live=num(r['GMV en vivo(M$)']),revenue_videos=num(r['GMV por vídeos(M$)']),total_live_count=int(num(r['Número de Transmisiones en vivo'])),gmv_live_mxn=num(r['GMV en vivo(M$)']),views_30d=int(num(r['Visualizaciones'])),sales_30d=int(num(r['Ventas'])),tiktok_url=r['Enlace de TikTok']))
for rank,r in enumerate(raw['products'],1):
    pid = ident(r['Enlace de TikTok'])
    assert pid and pid == ident(r['Enlace de Kalodata'])
    # Store the lowest listed variant price for ranges, never parse 127-128 as 127128.
    price,commission = num(str(r['Precio (M$)']).split('-')[0]), num(r['Tasa de comisión'])
    payload['products'].append(dict(tiktok_product_id=pid,producto_nombre=r['Nombre del producto'],producto_url=r['Enlace de TikTok'],imagen_url=r['Enlace de la imagen'],categoria=r['Categoría'],precio_mxn=price,price=price,currency='MXN',total_ventas=int(num(r['Ventas'])),total_ingresos_mxn=num(r['Ingresos(M$)']),revenue_30d=num(r['Ingresos(M$)']),gmv_30d_mxn=num(r['Ingresos(M$)']),commission=commission,commission_amount=round(price*commission/100,4),creators_count=int(num(r['Número de creadores'])),creators_active_30d=int(num(r['Número de creadores'])),rating=num(r['Calificaciones del producto']),rank=rank,market='mx',identity_status='catalog'))
for rank,r in enumerate(raw['videos'],1):
    vid,pid=ident(r['Enlace de TikTok']),ident(r['Ver en Kalodata'])
    assert vid and vid == ident(r['Enlace de Kalodata'])
    payload['videos'].append(dict(tiktok_video_id=vid,tiktok_product_id=pid,source_product_url=r['Ver en Kalodata'],video_url=r['Enlace de TikTok'],title=r['Descripción del vídeo'],creator_handle=str(r['Usuario del creador']).strip().lstrip('@').lower(),product_name=r['Título del producto'],category=r['Categoría del producto'],country='mx',duration=seconds(r['Duración']),revenue_mxn=num(r['Ingresos (M$)']),sales=int(num(r['Ventas'])),views=int(num(r['Visualizaciones'])),roas=num(r['ROAS - Retorno de la inversión publicitaria']),rank=rank,snapshot_date_range=period))
for kind,key in [('creators','creator_handle'),('products','tiktok_product_id'),('videos','tiktok_video_id')]:
    assert len({r[key] for r in payload[kind]}) == len(payload[kind]), f'Duplicate {kind} identity'


summary={'snapshot':period,'files':{k:{'name':v,'sha256':hashlib.sha256((SOURCE/v).read_bytes()).hexdigest(),'rows':len(payload[k])} for k,v in files.items()},'videos_with_product_id':sum(bool(r['tiktok_product_id']) for r in payload['videos']),'videos_matching_exported_products':sum(r['tiktok_product_id'] in {p['tiktok_product_id'] for p in payload['products']} for r in payload['videos'])}
(OUT/'payload.json').write_text(json.dumps(payload,ensure_ascii=False))
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False))
