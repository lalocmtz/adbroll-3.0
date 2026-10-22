import { pickString, pickNumber, extractTikTokProductId, extractTikTokVideoId, VIDEO_COLUMNS } from './kalodata.ts';
export type ImportKind = 'videos' | 'products' | 'creators';
type Row = Record<string, unknown>;
const str = (r: Row, ...keys: string[]) => pickString(r, keys);
const num = (r: Row, ...keys: string[]) => pickNumber(r, keys);
const integer = (r: Row, ...keys: string[]) => { const n=num(r,...keys); return n===null?null:Math.round(n); };
const handle = (value: string | null) => (value || '').replace(/^@/,'').trim().toLowerCase();
function period(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('El Excel debe incluir Rango de fechas (AAAA-MM-DD~AAAA-MM-DD).');
  const [start,end]=value.split('~');
  const a=new Date(start),b=new Date(end);
  if(!Number.isFinite(+a)||!Number.isFinite(+b)||a.toISOString().slice(0,10)!==start||b.toISOString().slice(0,10)!==end||b<a) throw new Error('Rango de fechas inválido.');
  return {value,days:(+b-+a)/86400000+1};
}
export function normalizeKalodata(rows: Row[], kind: ImportKind, market: string) {
  if(!['videos','products','creators'].includes(kind)||!['mx','us'].includes(market)) throw new Error('Tipo o mercado inválido.');
  if(!rows.length||rows.length>10000) throw new Error('El archivo debe contener entre 1 y 10,000 filas.');
  const report=period(str(rows[0],'Rango de fechas','Date Range'));
  if(kind!=='videos'&&report.days!==30) throw new Error('Para productos y creadores importa un reporte de 30 días. Los videos admiten otros periodos.');
  const seen=new Set<string>();
  const normalized=rows.map((r,index)=>{
    if(period(str(r,'Rango de fechas','Date Range')).value!==report.value) throw new Error('No mezcles periodos en un mismo archivo.');
    let result: Row,identity: string | null;
    if(kind==='videos') {
      const url=str(r,...VIDEO_COLUMNS.videoUrl),id=extractTikTokVideoId(url);
      if(!url||!id||!/^https:\/\/(www\.)?tiktok\.com\/@[^/]+\/video\/\d+(?:[?#].*)?$/.test(url)) throw new Error(`Fila ${index+2}: enlace completo de TikTok inválido.`);
      const productUrl=str(r,...VIDEO_COLUMNS.productUrl),pid=str(r,...VIDEO_COLUMNS.productId)||extractTikTokProductId(productUrl);
      const creator=handle(str(r,...VIDEO_COLUMNS.creatorHandle));
      const duration=str(r,'Duración','Duration')||'';
      const seconds=[...duration.matchAll(/(\d+)\s*([hms])/g)].reduce((n,m)=>n+Number(m[1])*({h:3600,m:60,s:1}[m[2]]||0),0);
      identity=id;
      result={tiktok_video_id:id,video_url:url.split(/[?#]/)[0],tiktok_product_id:pid,source_product_url:productUrl,title:str(r,...VIDEO_COLUMNS.title),creator_handle:creator,product_name:str(r,...VIDEO_COLUMNS.productName),category:str(r,'Categoría del producto',...VIDEO_COLUMNS.category),country:market,duration:seconds||null,revenue_mxn:num(r,...VIDEO_COLUMNS.revenue),sales:integer(r,...VIDEO_COLUMNS.sales),views:integer(r,...VIDEO_COLUMNS.views),roas:num(r,...VIDEO_COLUMNS.roas),rank:index+1,snapshot_date_range:report.value};
    } else if(kind==='products') {
      const url=str(r,'Enlace de TikTok','URL del producto','Product URL');
      identity=extractTikTokProductId(url)||extractTikTokProductId(str(r,'Enlace de Kalodata'));
      const name=str(r,'Nombre del producto','Product Name');
      if(!name||!identity) throw new Error(`Fila ${index+2}: falta nombre o ID del producto.`);
      // Kalodata price ranges describe variants: display the lowest price, never concatenate digits.
      const priceRaw=str(r,'Precio (M$)','Price','Price (USD)');
      const price=priceRaw?num({price:priceRaw.split('-')[0]},'price'):null;
      const commission=num(r,'Tasa de comisión','Comisión','Commission');
      const revenue=num(r,'Ingresos(M$)','Ingresos (M$)','Revenue','Revenue (USD)');
      const creators=integer(r,'Número de creadores','Creators');
      result={tiktok_product_id:identity,producto_nombre:name,producto_url:url,imagen_url:str(r,'Enlace de la imagen','Product Image','Imagen URL'),categoria:str(r,'Categoría','Category'),precio_mxn:price,price,currency:market==='mx'?'MXN':'USD',total_ventas:integer(r,'Ventas','Sales'),total_ingresos_mxn:revenue,revenue_30d:revenue,gmv_30d_mxn:revenue,commission,commission_amount:price!==null&&commission!==null?price*commission/100:null,creators_count:creators,creators_active_30d:creators,rating:num(r,'Calificaciones del producto','Rating'),rank:index+1,market,identity_status:'catalog'};
    } else {
      identity=handle(str(r,'Usuario del creador','Creator Username','Creator Handle'));
      if(!/^[a-z0-9._]+$/.test(identity)) throw new Error(`Fila ${index+2}: usuario del creador inválido.`);
      const revenue=num(r,'Ingresos(M$)','Ingresos (M$)','Revenue','Revenue (USD)');
      const live=num(r,'GMV en vivo(M$)','Live Revenue');
      result={usuario_creador:identity,creator_handle:identity,nombre_completo:str(r,'Nombre del creador','Creator Name'),country:market,seguidores:integer(r,'Seguidores','Followers'),total_videos:integer(r,'Número de vídeos','Número de videos','Video Count'),total_ventas:integer(r,'Ventas','Sales'),total_ingresos_mxn:revenue,revenue_live:live,revenue_videos:num(r,'GMV por vídeos(M$)','GMV por videos(M$)','Video Revenue'),total_live_count:integer(r,'Número de Transmisiones en vivo','Live Count'),gmv_live_mxn:live,views_30d:integer(r,'Visualizaciones','Views'),sales_30d:integer(r,'Ventas','Sales'),tiktok_url:`https://www.tiktok.com/@${identity}`};
    }
    if(!identity||seen.has(identity)) throw new Error(`Fila ${index+2}: ID vacío o repetido; revisa el archivo antes de importar.`);
    seen.add(identity);
    for(const value of Object.values(result)) if(typeof value==='number'&&(!Number.isFinite(value)||value<0)) throw new Error(`Fila ${index+2}: métrica inválida.`);
    return result;
  });
  return {rows:normalized,period:report.value};
}
