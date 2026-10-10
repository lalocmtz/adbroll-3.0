import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { AIError } from '../_shared/ai-contracts.ts';
import { authenticatedAI, failure, headers, reply } from '../_shared/gemini.ts';
import { normalizeKalodata, ImportKind } from '../_shared/kalodata-import.ts';
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response(null,{headers});
  try {
    const {db,userId}=await authenticatedAI(req);
    const role=await db.from('user_roles').select('role').eq('user_id',userId).eq('role','founder').maybeSingle();
    if(role.error||!role.data) throw new AIError('Solo el fundador puede importar datos.',403);
    const form=await req.formData(),file=form.get('file');
    if(!(file instanceof File)||file.size>25*1024*1024||!file.size) throw new AIError('Selecciona un Excel de hasta 25 MB.',400);
    let normalized;
    const kind=String(form.get('kind')) as ImportKind,market=String(form.get('market'));
    try {
      const book=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const sheet=book.SheetNames.find(name=>name.toUpperCase()===`LIST_${{videos:'VIDEO',products:'PRODUCT',creators:'CREATOR'}[kind]}`)||book.SheetNames[0];
      normalized=normalizeKalodata(XLSX.utils.sheet_to_json(book.Sheets[sheet]),kind,market);
    } catch(error) { throw new AIError(error instanceof Error?error.message:'Excel inválido.',400); }
    const {data,error}=await db.rpc('import_kalodata_rows',{p_kind:kind,p_market:market,p_period:normalized.period,p_filename:file.name,p_rows:normalized.rows});
    if(error) { console.error('Kalodata import failed',error.code); throw new AIError('No se importó el archivo: conflicto de identidad o datos inválidos. Conservamos el catálogo anterior; revisa el archivo.',409); }
    return reply(data);
  } catch(error) { return failure(error); }
});
