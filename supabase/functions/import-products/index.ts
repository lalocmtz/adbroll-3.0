import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'founder')
      .maybeSingle();

    if (!roleData) throw new Error('Founder role required');

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    let rows: any[] = [];
    const fileName = file.name.toLowerCase();

    // Parse based on file type
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    } else if (fileName.endsWith('.csv')) {
      const csvText = await file.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV is empty');
      
      const headers = lines[0].split(',').map(h => h.trim());
      rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i];
        });
        return row;
      });
    } else {
      throw new Error('Unsupported file format. Please upload .csv, .xls, or .xlsx');
    }

    // Normalize column names - aggressive normalization
    const normalize = (str: string) =>
      str.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

    rows = rows.map(row => {
      const normalized: any = {};
      for (const key in row) {
        normalized[normalize(key)] = row[key];
      }
      return normalized;
    });
    
    let processed = 0;
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      const productName = row.product_name || row.producto_nombre || row.product || row.nombre;
      const tiktokProductId = row.tiktok_product_id || row.product_id || row.id;
      
      if (!productName) continue; // Skip silently if no product name

      processed++;

      const productData = {
        producto_nombre: productName,
        tiktok_product_id: tiktokProductId || null,
        categoria: row.category || row.categoria || null,
        price: parseFloat(row.price || row.precio || '0'),
        currency: row.currency || row.moneda || 'MXN',
        total_ventas: parseInt(row.total_sales || row.ventas || '0'),
        total_ingresos_mxn: parseFloat(row.total_revenue_mxn || row.ingresos_mxn || row.revenue || '0'),
        is_opportunity: row.is_opportunity === 'true' || row.is_opportunity === true || row.oportunidad === 'true' || false,
        last_import: new Date().toISOString(),
      };

      if (tiktokProductId) {
        const { data: existing } = await supabaseService
          .from('products')
          .select('id')
          .eq('tiktok_product_id', tiktokProductId)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabaseService
            .from('products')
            .update({
              price: productData.price,
              total_ventas: productData.total_ventas,
              total_ingresos_mxn: productData.total_ingresos_mxn,
              last_import: productData.last_import,
            })
            .eq('id', existing.id);

          if (!updateError) {
            updated++;
          }
          continue;
        }
      }

      const { error: insertError } = await supabaseService
        .from('products')
        .insert(productData);

      if (!insertError) {
        inserted++;
      }
    }

    await supabaseService.from('imports').insert({
      file_name: file.name,
      total_rows: rows.length,
      products_imported: inserted + updated,
    });

    const message = `✅ Success! Processed: ${processed}, Inserted: ${inserted}, Updated: ${updated}`;

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
