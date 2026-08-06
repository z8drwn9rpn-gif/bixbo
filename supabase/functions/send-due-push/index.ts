import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  "mailto:you@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async () => {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) {
    return Response.json(error, { status: 500 });
  }

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify({
          title: "BIXBO",
          body: "You have a reminder.",
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  return Response.json({
    success: true,
    sent: subs?.length ?? 0,
  });
});
