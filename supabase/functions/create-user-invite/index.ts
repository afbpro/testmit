// Supabase Edge Function: create-user-invite
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }

  // Robust Content-Type and JSON parsing
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'Content-Type must be application/json', received: contentType }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: any = undefined;
  let rawBody: string | undefined = undefined;
  try {
    // Try to parse JSON
    rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch (err) {
    // If JSON parsing fails, get the raw body for diagnostics
    return new Response(
      JSON.stringify({ error: 'JSON inválido', details: String(err), rawBody }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.email || !body.rol_id) {
    return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), { status: 400 });
  }
  
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!service_role || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Faltan variables de entorno" }), { status: 500 });
  }
  
  const adminClient = (await import("https://esm.sh/@supabase/supabase-js@2.39.7")).createClient(
    supabaseUrl,
    service_role,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
    data: { username: body.username, rol_id: body.rol_id }
  });
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  
  return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
});
