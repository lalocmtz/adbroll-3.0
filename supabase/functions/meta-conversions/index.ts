import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_PIXEL_ID = "1180309310977788";
const META_API_VERSION = "v18.0";

// SHA-256 hash function for user data (Meta requires lowercase + trimmed + hashed)
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize phone number (remove non-digits, ensure country code)
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // If starts with 00, replace with +
  if (normalized.startsWith('00')) {
    normalized = normalized.substring(2);
  }
  
  // Add country code if missing (default to +52 for Mexico)
  if (normalized.length === 10) {
    normalized = '52' + normalized;
  }
  
  return normalized;
}

interface ConversionEvent {
  event_name: string;
  event_id?: string;
  event_time?: number;
  event_source_url?: string;
  user_data?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
    order_id?: string;
  };
  action_source?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
    
    if (!META_ACCESS_TOKEN) {
      console.error('META_ACCESS_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'Meta Access Token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { events }: { events: ConversionEvent[] } = await req.json();

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No events provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from request headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Process events for Meta API format
    const processedEvents = await Promise.all(events.map(async (event) => {
      const eventTime = event.event_time || Math.floor(Date.now() / 1000);
      
      // Build user_data with hashed values
      const userData: Record<string, any> = {};
      
      // Hash email if provided
      if (event.user_data?.email) {
        userData.em = [await hashData(event.user_data.email)];
      }
      
      // Hash phone if provided (normalize first)
      if (event.user_data?.phone) {
        const normalizedPhone = normalizePhone(event.user_data.phone);
        userData.ph = [await hashData(normalizedPhone)];
      }
      
      // Hash first name if provided
      if (event.user_data?.first_name) {
        userData.fn = [await hashData(event.user_data.first_name)];
      }
      
      // Hash last name if provided
      if (event.user_data?.last_name) {
        userData.ln = [await hashData(event.user_data.last_name)];
      }
      
      // Hash city if provided
      if (event.user_data?.city) {
        userData.ct = [await hashData(event.user_data.city)];
      }
      
      // Hash state if provided
      if (event.user_data?.state) {
        userData.st = [await hashData(event.user_data.state)];
      }
      
      // Hash country if provided (use 2-letter code)
      if (event.user_data?.country) {
        userData.country = [await hashData(event.user_data.country)];
      }
      
      // Hash zip if provided
      if (event.user_data?.zip) {
        userData.zp = [await hashData(event.user_data.zip)];
      }
      
      // Hash external_id if provided (for cross-device matching)
      if (event.user_data?.external_id) {
        userData.external_id = [await hashData(event.user_data.external_id)];
      }
      
      // Add IP and user agent (not hashed)
      userData.client_ip_address = event.user_data?.client_ip_address || clientIp;
      userData.client_user_agent = event.user_data?.client_user_agent || userAgent;
      
      // Add Facebook click and browser IDs if available (not hashed)
      if (event.user_data?.fbc) {
        userData.fbc = event.user_data.fbc;
      }
      if (event.user_data?.fbp) {
        userData.fbp = event.user_data.fbp;
      }

      const processedEvent: Record<string, any> = {
        event_name: event.event_name,
        event_time: eventTime,
        action_source: event.action_source || 'website',
        user_data: userData,
      };

      // Add event_id for deduplication (critical for matching browser events)
      if (event.event_id) {
        processedEvent.event_id = event.event_id;
      }

      if (event.event_source_url) {
        processedEvent.event_source_url = event.event_source_url;
      }

      if (event.custom_data) {
        processedEvent.custom_data = {};
        if (event.custom_data.currency) {
          processedEvent.custom_data.currency = event.custom_data.currency;
        }
        if (event.custom_data.value !== undefined) {
          processedEvent.custom_data.value = event.custom_data.value;
        }
        if (event.custom_data.content_name) {
          processedEvent.custom_data.content_name = event.custom_data.content_name;
        }
        if (event.custom_data.content_category) {
          processedEvent.custom_data.content_category = event.custom_data.content_category;
        }
        if (event.custom_data.content_ids) {
          processedEvent.custom_data.content_ids = event.custom_data.content_ids;
        }
        if (event.custom_data.content_type) {
          processedEvent.custom_data.content_type = event.custom_data.content_type;
        }
        if (event.custom_data.num_items !== undefined) {
          processedEvent.custom_data.num_items = event.custom_data.num_items;
        }
        if (event.custom_data.order_id) {
          processedEvent.custom_data.order_id = event.custom_data.order_id;
        }
      }

      return processedEvent;
    }));

    console.log('Sending events to Meta Conversions API:', JSON.stringify({
      event_count: processedEvents.length,
      event_names: processedEvents.map(e => e.event_name),
      event_ids: processedEvents.map(e => e.event_id),
      has_user_data: processedEvents.map(e => Object.keys(e.user_data || {}).length),
    }));

    // Send to Meta Conversions API
    const metaResponse = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: processedEvents,
        }),
      }
    );

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('Meta API error:', JSON.stringify(metaResult));
      return new Response(
        JSON.stringify({ error: 'Meta API error', details: metaResult }),
        { status: metaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meta Conversions API response:', JSON.stringify(metaResult));

    return new Response(
      JSON.stringify({ 
        success: true, 
        events_received: metaResult.events_received,
        event_ids: processedEvents.map(e => e.event_id).filter(Boolean),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in meta-conversions function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
