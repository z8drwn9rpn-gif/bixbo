import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, error: "Sign in to manage your account." }, 401);
  }

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json({ ok: false, error: "Your session has expired." }, 401);

  let body: { action?: unknown } = {};
  try {
    body = (await req.json()) as { action?: unknown };
  } catch {
    return json({ ok: false, error: "Request body must be JSON." }, 400);
  }
  if (body.action !== "delete-account") return json({ ok: false, error: "Unknown action." }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error("account-privacy delete failed", deleteError.message);
    return json({ ok: false, error: "The cloud account could not be deleted." }, 500);
  }

  return json({
    ok: true,
    deleted: true,
    localDataPreserved: true,
  });
});
