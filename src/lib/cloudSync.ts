import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getBixbo, replaceBixbo, setPartner, subscribeBixboChanges, type BixboData, type PartnerData } from "./storage";
import { mergeBixbo } from "./merge";

export interface CloudProfile {
  id: string;
  display_name: string | null;
  gender: string | null;
  pairing_code: string;
}

/**
 * Only these fields are stored in partner_shared_data and returned through
 * Couple sharing. The complete BixboData object remains private in user_data.
 */
type PartnerSharedPayload = {
  dayLogs: BixboData["dayLogs"];
  meds: BixboData["meds"];
  medLog: BixboData["medLog"];
};

/**
 * partner_shared_data has the same row shape as user_data.
 * This alias keeps the current generated Supabase types compiling until
 * src/integrations/supabase/types.ts is regenerated with the new table.
 */
const PARTNER_SHARED_DATA_TABLE = "partner_shared_data" as "user_data";

export async function ensureProfile(displayName?: string): Promise<CloudProfile | null> {
  const { data, error } = await supabase.rpc("ensure_profile", {
    _display_name: displayName ?? undefined,
  });

  if (error) {
    console.error("ensureProfile", error);
    return null;
  }

  return data as unknown as CloudProfile;
}

export async function updateProfile(patch: Partial<Pick<CloudProfile, "display_name" | "gender">>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

  if (error) {
    console.error("updateProfile", error);
    throw error;
  }
}

export async function linkPartnerByCode(code: string): Promise<CloudProfile> {
  const { data, error } = await supabase.rpc("link_partner_by_code", {
    _code: code.trim().toUpperCase(),
  });

  if (error) throw error;

  return data as unknown as CloudProfile;
}

export async function unlinkPartner(): Promise<void> {
  const { error } = await supabase.rpc("unlink_partner");

  if (error) throw error;
}

/**
 * Build the narrow payload that a linked partner is allowed to read.
 *
 * Deliberately excluded:
 * - dayNotes and notebook notes
 * - sex, food and bowel logs
 * - mood and energy logs
 * - period and cycle data
 * - workouts
 * - temperature, sleep and weight
 * - tasks, events, labs, documents and diagnoses
 * - settings, custom lists and deleted IDs
 */
function toPartnerSharedPayload(payload: BixboData): PartnerSharedPayload {
  const dayLogs: BixboData["dayLogs"] = {};

  for (const [date, log] of Object.entries(payload.dayLogs ?? {})) {
    const pain = log.pain?.length ? log.pain : undefined;
    const panic = log.panic?.length ? log.panic : undefined;
    const tetany = log.tetany?.length ? log.tetany : undefined;
    const extraMeds = log.extraMeds?.length ? log.extraMeds : undefined;

    if (pain || panic || tetany || extraMeds) {
      dayLogs[date] = {
        pain,
        panic,
        tetany,
        extraMeds,
      };
    }
  }

  return {
    dayLogs,
    meds: payload.meds ?? [],
    medLog: payload.medLog ?? {},
  };
}

function toPartnerView(shared: PartnerSharedPayload | null, name: string, gender?: string | null): PartnerData {
  const dayLogs: PartnerData["dayLogs"] = {};

  for (const [date, log] of Object.entries(shared?.dayLogs ?? {})) {
    if (log?.pain?.length || log?.panic?.length || log?.tetany?.length || log?.extraMeds?.length) {
      dayLogs[date] = {
        pain: log.pain,
        panic: log.panic,
        tetany: log.tetany,
        extraMeds: log.extraMeds,
      };
    }
  }

  const safeGender = gender === "female" || gender === "male" ? gender : undefined;

  return {
    name,
    dayLogs,
    dayNotes: {},
    meds: shared?.meds ?? [],
    medLog: shared?.medLog ?? {},
    gender: safeGender,
    importedAt: Date.now(),
  };
}

export async function fetchPartner(): Promise<PartnerData | null> {
  const { data, error } = await supabase.rpc("get_partner");

  if (error) {
    console.error("fetchPartner", error);
    return null;
  }

  const row = (
    data as Array<{
      id: string;
      display_name: string | null;
      gender: string | null;
      data: PartnerSharedPayload | null;
    }>
  )?.[0];

  if (!row) return null;

  return toPartnerView(row.data, row.display_name || "Partner", row.gender);
}

export async function pullMyData(): Promise<BixboData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.from("user_data").select("data").eq("user_id", user.id).maybeSingle();

  if (error) {
    console.error("pullMyData", error);
    throw error;
  }

  return (data?.data as unknown as BixboData) ?? null;
}

/*
 * Track the last private payload we pushed so realtime can ignore an echo of
 * our own write and avoid a merge/push feedback loop.
 */
let _lastPushedJson: string | null = null;

export async function pushMyData(payload: BixboData): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const privatePayload = {
    ...payload,
    partner: undefined,
  };

  const partnerPayload = toPartnerSharedPayload(payload);

  _lastPushedJson = JSON.stringify(privatePayload);

  const [privateResult, sharedResult] = await Promise.all([
    supabase.from("user_data").upsert({
      user_id: user.id,
      data: privatePayload as never,
    }),

    supabase.from(PARTNER_SHARED_DATA_TABLE).upsert({
      user_id: user.id,
      data: partnerPayload as never,
    }),
  ]);

  if (privateResult.error) {
    console.error("pushMyData private data", privateResult.error);
    throw privateResult.error;
  }

  if (sharedResult.error) {
    console.error("pushMyData partner data", sharedResult.error);
    throw sharedResult.error;
  }
}

/* ------------------- Immediate-flush queue ------------------- */

let _flushingPromise: Promise<void> | null = null;

export async function flushMyDataPush(): Promise<void> {
  if (_flushingPromise) return _flushingPromise;

  _flushingPromise = (async () => {
    try {
      await pushMyData(getBixbo());
    } catch (error) {
      console.error("flushMyDataPush", error);
    } finally {
      _flushingPromise = null;
    }
  })();

  return _flushingPromise;
}

if (typeof window !== "undefined") {
  const flush = () => {
    void flushMyDataPush();
  };

  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });
}

/* ------------------- Session hook ------------------- */

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return {
    session,
    ready,
    user: session?.user ?? null,
  };
}

/* ------------------- Sync orchestrator ------------------- */

export function useCloudSync() {
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      setPartner(undefined);
      return;
    }

    let cancelled = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      try {
        await ensureProfile();

        const remote = await pullMyData();

        if (cancelled) return;

        if (remote) {
          // Never overwrite: merge local and remote so neither device loses data.
          const merged = mergeBixbo(getBixbo(), remote);

          replaceBixbo(
            {
              ...merged,
              partner: getBixbo().partner,
            },
            "remote",
          );

          // Also refresh the narrow partner_shared_data payload.
          await pushMyData(merged);
        } else {
          // First sync: save private data and the narrow partner payload.
          await pushMyData(getBixbo());
        }

        const partner = await fetchPartner();

        if (!cancelled) {
          setPartner(partner ?? undefined);
        }
      } catch (error) {
        console.error("useCloudSync initial sync", error);
      }
    })();

    const unsubscribeStore = subscribeBixboChanges((nextData, reason) => {
      if (reason !== "local") return;

      if (pushTimer) {
        clearTimeout(pushTimer);
      }

      pushTimer = setTimeout(() => {
        pushMyData(nextData).catch(console.error);
      }, 200);
    });

    const refreshPartner = async () => {
      const partner = await fetchPartner();

      if (!cancelled) {
        setPartner(partner ?? undefined);
      }
    };

    /*
     * user_data listener:
     * Only the signed-in user's private row is observed for multi-device sync.
     *
     * partner_shared_data listener:
     * Refreshes Couple data without exposing the partner's private user_data.
     */
    const channel = supabase
      .channel(`bixbo-sync-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_data",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const incoming = (payload.new as { data?: BixboData } | undefined)?.data;

          if (!incoming) return;

          const incomingJson = JSON.stringify({
            ...incoming,
            partner: undefined,
          });

          // Ignore a realtime echo of our own most recent private write.
          if (incomingJson === _lastPushedJson) return;

          const merged = mergeBixbo(getBixbo(), incoming);
          const mergedJson = JSON.stringify({
            ...merged,
            partner: undefined,
          });

          replaceBixbo(
            {
              ...merged,
              partner: getBixbo().partner,
            },
            "remote",
          );

          // Push only when merging actually added something to the remote copy.
          if (mergedJson !== incomingJson) {
            pushMyData(merged).catch(console.error);
          }
        },
      )
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
      .subscribe();

    return () => {
      cancelled = true;

      if (pushTimer) {
        clearTimeout(pushTimer);
      }

      unsubscribeStore();
      void supabase.removeChannel(channel);
    };
  }, [ready, session?.user?.id]);
}
