import { describe, it, expect } from 'vitest';
import { normalizeKalodata } from '../supabase/functions/_shared/kalodata-import';
const report='2026-09-10~2026-10-09';
const video={'Rango de fechas':report,'Enlace de TikTok':'https://www.tiktok.com/@test_user/video/7652957372519959828','Usuario del creador':'@Test_User','Ingresos (M$)':123,'Ventas':3,'Visualizaciones':10,'Título del producto':'Same title','Ver en Kalodata':'https://www.kalodata.com/product/detail?id=1736327955572163659'};
describe('safe Kalodata import',()=>{
 it('preserves large IDs, exact product identity and underscore handles without media or contacts',()=>{
  const x=normalizeKalodata([{...video,email:'private@example.com',video_mp4_url:'untrusted'}],'videos','mx');
  expect(x.rows[0]).toMatchObject({tiktok_video_id:'7652957372519959828',tiktok_product_id:'1736327955572163659',creator_handle:'test_user',revenue_mxn:123});
  expect(x.rows[0]).not.toHaveProperty('email');expect(x.rows[0]).not.toHaveProperty('video_mp4_url');
 });
 it('accepts 7-day video reports but prevents relabeling product metrics as 30-day',()=>{
  const week='2026-10-03~2026-10-09';
  expect(normalizeKalodata([{...video,'Rango de fechas':week}],'videos','mx').period).toBe(week);
  expect(()=>normalizeKalodata([{'Rango de fechas':week}],'products','mx')).toThrow('30 días');
 });
 it('rejects mixed periods, duplicate identities and foreign URLs before writing',()=>{
  expect(()=>normalizeKalodata([video,{...video,'Rango de fechas':'2026-10-03~2026-10-09'}],'videos','mx')).toThrow('periodos');
  expect(()=>normalizeKalodata([video,video],'videos','mx')).toThrow('repetido');
  expect(()=>normalizeKalodata([{...video,'Enlace de TikTok':'https://evil.test/@a/video/7652957372519959828'}],'videos','mx')).toThrow('inválido');
 });
 it('does not deduplicate different SKUs with the same name; parses the lowest variant price',()=>{
  const product={'Rango de fechas':report,'Nombre del producto':'Same','Enlace de TikTok':'https://shop.tiktok.com/view/product/1736327955572163659','Precio (M$)':'127-289','Tasa de comisión':'15%','Ingresos(M$)':1000};
  const x=normalizeKalodata([product,{...product,'Enlace de TikTok':'https://shop.tiktok.com/view/product/1736327955572163660'}],'products','mx');
  expect(x.rows).toHaveLength(2);expect(x.rows[0]).toMatchObject({price:127,commission:15,commission_amount:19.05});
 });
});
