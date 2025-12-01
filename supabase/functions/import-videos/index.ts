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
    
    const requiredColumns = ['rank', 'video_url', 'title', 'creator_handle', 'creator_name', 
                              'product_name', 'category', 'country', 'views', 'sales', 
                              'revenue_mxn', 'roas'];
    
    for (const col of requiredColumns) {
      if (!headers.includes(col)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }

    const colIdx = (name: string) => headers.indexOf(name);
    
    let processed = 0;
    let inserted = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const videoUrl = cols[colIdx('video_url')];
      
      if (!videoUrl) continue;

      processed++;

      const { data: existing } = await supabaseService
        .from('videos')
        .select('id')
        .eq('video_url', videoUrl)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabaseService
        .from('videos')
        .insert({
          rank: parseInt(cols[colIdx('rank')] || '0'),
          video_url: videoUrl,
          title: cols[colIdx('title')] || null,
          creator_handle: cols[colIdx('creator_handle')] || null,
          creator_name: cols[colIdx('creator_name')] || null,
          product_name: cols[colIdx('product_name')] || null,
          category: cols[colIdx('category')] || null,
          country: cols[colIdx('country')] || null,
          views: parseInt(cols[colIdx('views')] || '0'),
          sales: parseInt(cols[colIdx('sales')] || '0'),
          revenue_mxn: parseFloat(cols[colIdx('revenue_mxn')] || '0'),
          roas: parseFloat(cols[colIdx('roas')] || '0'),
        });

      if (!insertError) {
        inserted++;
      }
    }

    await supabaseService.from('imports').insert({
      file_name: file.name,
      total_rows: lines.length - 1,
      videos_imported: inserted,
    });

    const message = `Processed: ${processed}, Inserted: ${inserted}, Skipped: ${skipped}`;

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
