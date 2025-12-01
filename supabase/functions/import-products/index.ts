import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV is empty');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredColumns = ['product_name', 'tiktok_product_id', 'category', 'price', 
                              'currency', 'total_sales', 'total_revenue_mxn', 'is_opportunity'];
    
    for (const col of requiredColumns) {
      if (!headers.includes(col)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }

    const colIdx = (name: string) => headers.indexOf(name);
    
    let processed = 0;
    let inserted = 0;
    let updated = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const productName = cols[colIdx('product_name')];
      const tiktokProductId = cols[colIdx('tiktok_product_id')];
      
      if (!productName) continue;

      processed++;

      const productData = {
        producto_nombre: productName,
        tiktok_product_id: tiktokProductId || null,
        categoria: cols[colIdx('category')] || null,
        price: parseFloat(cols[colIdx('price')] || '0'),
        currency: cols[colIdx('currency')] || 'MXN',
        total_ventas: parseInt(cols[colIdx('total_sales')] || '0'),
        total_ingresos_mxn: parseFloat(cols[colIdx('total_revenue_mxn')] || '0'),
        is_opportunity: cols[colIdx('is_opportunity')]?.toLowerCase() === 'true',
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
              is_opportunity: productData.is_opportunity,
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
      total_rows: lines.length - 1,
      products_imported: inserted + updated,
    });

    const message = `Processed: ${processed}, Inserted: ${inserted}, Updated: ${updated}`;

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
