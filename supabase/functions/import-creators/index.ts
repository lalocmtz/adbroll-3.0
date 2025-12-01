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
    
    const requiredColumns = ['creator_handle', 'creator_name', 'followers', 
                              'total_sales', 'total_revenue_mxn', 'country'];
    
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
      const creatorHandle = cols[colIdx('creator_handle')];
      
      if (!creatorHandle) continue;

      processed++;

      const creatorData = {
        usuario_creador: creatorHandle,
        creator_handle: creatorHandle,
        nombre_completo: cols[colIdx('creator_name')] || null,
        seguidores: parseInt(cols[colIdx('followers')] || '0'),
        total_ventas: parseInt(cols[colIdx('total_sales')] || '0'),
        total_ingresos_mxn: parseFloat(cols[colIdx('total_revenue_mxn')] || '0'),
        country: cols[colIdx('country')] || null,
        last_import: new Date().toISOString(),
      };

      const { data: existing } = await supabaseService
        .from('creators')
        .select('id')
        .eq('usuario_creador', creatorHandle)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabaseService
          .from('creators')
          .update({
            seguidores: creatorData.seguidores,
            total_ventas: creatorData.total_ventas,
            total_ingresos_mxn: creatorData.total_ingresos_mxn,
            last_import: creatorData.last_import,
          })
          .eq('id', existing.id);

        if (!updateError) {
          updated++;
        }
        continue;
      }

      const { error: insertError } = await supabaseService
        .from('creators')
        .insert(creatorData);

      if (!insertError) {
        inserted++;
      }
    }

    await supabaseService.from('imports').insert({
      file_name: file.name,
      total_rows: lines.length - 1,
      creators_imported: inserted + updated,
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
