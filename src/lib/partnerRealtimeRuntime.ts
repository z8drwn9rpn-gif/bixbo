import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchPartner, useSession } from "./cloudSync";
import { setPartner } from "./storage";

function logPartnerRefreshError(error: unknown): void {
  console.warn("BIXBO partner realtime refresh:", error);
}

/**
 * Couple data is interactive UI, not a five-minute background aggregate.
 * Keep the network-efficient private diary sync, but restore a narrow realtime
 * listener for the two tables that can change the visible partner projection.
 */
export function usePartnerRealtimeRefresh(): void {
  const { session, ready } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setPartner(undefined);
      return;
    }

    let stopped = false;
    let refreshInFlight: Promise<void> | null = null;
    let refreshQueued = false;

    const refreshPartner = (): Promise<void> => {
      if (refreshInFlight) {
        refreshQueued = true;
        return refreshInFlight;
      }

      refreshInFlight = (async () => {
        do {
          refreshQueued = false;
          try {
            const partner = await fetchPartner();
            if (!stopped) setPartner(partner ?? undefined);
          } catch (error) {
            logPartnerRefreshError(error);
          }
        } while (!stopped && refreshQueued);
      })().finally(() => {
        refreshInFlight = null;
      });

      return refreshInFlight;
    };

    const channel = supabase
      .channel(`bixbo-partner-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partner_shared_data",
        },
        () => {
          void refreshPartner();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partner_links",
        },
        () => {
          void refreshPartner();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refreshPartner();
      });

    const onOnline = () => void refreshPartner();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPartner();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    void refreshPartner();

    return () => {
      stopped = true;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [ready, userId]);
}
