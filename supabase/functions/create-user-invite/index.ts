// Supabase Edge Function: create-user-invite
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }

  let email, username, rol_id;
  let rawBody = "";
  try {
    rawBody = await req.text();
    const body = JSON.parse(rawBody);
    email = body.email;
    username = body.username;
    rol_id = body.rol_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "JSON inválido. Body recibido: " + rawBody }),
      { status: 400 }
    );
  }

  if (!email || !rol_id) {
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

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { username, rol_id }
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
});
