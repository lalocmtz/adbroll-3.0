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

    // Normalize column names to lowercase
    rows = rows.map(row => {
      const normalized: any = {};
      for (const key in row) {
        normalized[key.toLowerCase().trim()] = row[key];
      }
      return normalized;
    });

    // Validate required fields
    const requiredFields = ['video_url', 'creator_name', 'revenue_mxn', 'sales', 'views'];
    for (const field of requiredFields) {
      const hasField = rows.some(row => row[field] !== undefined && row[field] !== null && row[field] !== '');
      if (!hasField) {
        throw new Error(`Missing required column: ${field}`);
      }
    }

    // Sort by revenue_mxn (descending) and take top 20
    rows.sort((a, b) => {
      const revA = parseFloat(a.revenue_mxn || '0');
      const revB = parseFloat(b.revenue_mxn || '0');
      return revB - revA;
    });
    rows = rows.slice(0, 20);

    let processed = 0;
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const videoUrl = row.video_url;
      
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
          rank: parseInt(row.rank || '0'),
          video_url: videoUrl,
          title: row.title || null,
          creator_handle: row.creator_handle || null,
          creator_name: row.creator_name || null,
          product_name: row.product_name || null,
          category: row.category || null,
          country: row.country || null,
          views: parseInt(row.views || '0'),
          sales: parseInt(row.sales || '0'),
          revenue_mxn: parseFloat(row.revenue_mxn || '0'),
          roas: parseFloat(row.roas || '0'),
        });

      if (!insertError) {
        inserted++;
      }
    }

    await supabaseService.from('imports').insert({
      file_name: file.name,
      total_rows: rows.length,
      videos_imported: inserted,
    });

    const message = `✅ Success! Processed top 20 videos by revenue. Inserted: ${inserted}, Skipped: ${skipped}`;

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
