import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

async function ping() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new Response(JSON.stringify({ ok: false, error: "missing config" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  // A cheap read is enough to count as project activity and prevent auto-pause.
  const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  return new Response(
    JSON.stringify({ ok: true, reachable: !error, at: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export const Route = createFileRoute("/api/public/hooks/keepalive")({
  server: {
    handlers: {
      GET: () => ping(),
      POST: () => ping(),
    },
  },
});
