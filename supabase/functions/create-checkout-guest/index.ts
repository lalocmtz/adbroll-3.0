import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
serve((req) => new Response(req.method === "OPTIONS" ? null : JSON.stringify({ error: "Crea tu cuenta y confirma tu correo antes de pagar", register_url: "https://tokxray.com/register?redirect=%2Fpricing" }), { status: req.method === "OPTIONS" ? 204 : 401, headers }));
