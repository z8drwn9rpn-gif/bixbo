import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  getBixbo, replaceBixbo, setPartner, subscribeBixboChanges,
  type BixboData, type PartnerData,
} from "./storage";
import { mergeBixbo } from "./merge";

export interface CloudProfile {
  id: string;
  display_name: string | null;
  gender: string | null;
  pairing_code: string;
}

export async function ensureProfile(displayName?: string): Promise<CloudProfile | null> {
  const { data, error } = await supabase.rpc("ensure_profile", { _display_name: displayName ?? undefined });
  if (error) { console.error("ensureProfile", error); return null; }
  return data as unknown as CloudProfile;
}
export async function updateProfile(patch: Partial<Pick<CloudProfile, "display_name" | "gender">>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update(patch).eq("id", user.id);
}
export async function linkPartnerByCode(code: string): Promise<CloudProfile> {
  const { data, error } = await supabase.rpc("link_partner_by_code", { _code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as unknown as CloudProfile;
}
export async function unlinkPartner(): Promise<void> {
  await supabase.rpc("unlink_partner");
}

function toPartnerView(bx: BixboData | null, name: string): PartnerData {
  const dayLogs: PartnerData["dayLogs"] = {};
  for (const [k, l] of Object.entries(bx?.dayLogs ?? {})) {
    if (l?.pain?.length || l?.panic?.length || l?.tetany?.length || l?.extraMeds?.length || l?.period || l?.periodInfo?.level) {
      dayLogs[k] = { pain: l.pain, panic: l.panic, tetany: l.tetany, extraMeds: l.extraMeds, period: l.period, periodInfo: l.periodInfo };
    }
  }
  return { name, dayLogs, dayNotes: bx?.dayNotes ?? {}, meds: bx?.meds ?? [], medLog: bx?.medLog ?? {}, cycle: bx?.cycle, gender: bx?.settings?.gender, importedAt: Date.now() };
}

export async function fetchPartner(): Promise<PartnerData | null> {
  const { data, error } = await supabase.rpc("get_partner");
  if (error) { console.error("fetchPartner", error); return null; }
  const row = (data as Array<{ id: string; display_name: string | null; data: BixboData | null }>)?.[0];
  if (!row) return null;
  return toPartnerView(row.data, row.display_name || "Partner");
}

export async function pullMyData(): Promise<BixboData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
  return (data?.data as unknown as BixboData) ?? null;
}

/* Track the last payload we pushed so we can ignore realtime echoes of our
 * own writes and avoid a merge/push feedback loop. */
let _lastPushedJson: string | null = null;

export async function pushMyData(payload: BixboData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const stripped = { ...payload, partner: undefined };
  _lastPushedJson = JSON.stringify(stripped);
  await supabase.from("user_data").upsert({ user_id: user.id, data: stripped as never });
}

/* ------------------- Immediate-flush queue -------------------
 * Wizards call flushMyDataPush() after Save so cloud write happens
 * synchronously (awaited) instead of after a debounce. We also flush on
 * pagehide / visibilitychange:hidden so a quick app close doesn't drop data.
 */
let _flushingPromise: Promise<void> | null = null;
export async function flushMyDataPush(): Promise<void> {
  if (_flushingPromise) return _flushingPromise;
  _flushingPromise = (async () => {
    try { await pushMyData(getBixbo()); }
    catch (e) { console.error("flushMyDataPush", e); }
    finally { _flushingPromise = null; }
  })();
  return _flushingPromise;
}
if (typeof window !== "undefined") {
  const flush = () => { void flushMyDataPush(); };
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}


/* ------------------- Session hook ------------------- */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, ready, user: session?.user ?? null };
}

/* ------------------- Sync orchestrator ------------------- */
export function useCloudSync() {
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!session) { setPartner(undefined); return; }

    let cancelled = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      await ensureProfile();
      const remote = await pullMyData();
      if (cancelled) return;
      if (remote) {
        // Never overwrite: union local + remote so neither side loses data.
        const merged = mergeBixbo(getBixbo(), remote);
        replaceBixbo({ ...merged, partner: getBixbo().partner }, "remote");
        // Push the merged result back so the cloud converges to the union too.
        await pushMyData(merged);
      } else {
        // First sync: push whatever we have locally so cloud has a copy
        await pushMyData(getBixbo());
      }
      const p = await fetchPartner();
      if (!cancelled) setPartner(p ?? undefined);
    })();

    const unsubStore = subscribeBixboChanges((d, reason) => {
      if (reason !== "local") return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { pushMyData(d).catch(console.error); }, 200);
    });

    // Realtime: merge in remote changes to our own row (from another device),
    // and refresh partner when their data or the link changes.
    const channel = supabase
      .channel(`bixbo-sync-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          const incoming = (payload.new as { data?: BixboData } | undefined)?.data;
          if (!incoming) return;
          const incomingJson = JSON.stringify({ ...incoming, partner: undefined });
          // Ignore echoes of our own just-pushed write.
          if (incomingJson === _lastPushedJson) return;
          const merged = mergeBixbo(getBixbo(), incoming);
          const mergedJson = JSON.stringify({ ...merged, partner: undefined });
          replaceBixbo({ ...merged, partner: getBixbo().partner }, "remote");
          // Only push back if the merge actually changed something vs. what's remote.
          if (mergedJson !== incomingJson) pushMyData(merged).catch(console.error);
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "user_data" }, async () => {
        const p = await fetchPartner();
        if (!cancelled) setPartner(p ?? undefined);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_links" }, async () => {
        const p = await fetchPartner();
        if (!cancelled) setPartner(p ?? undefined);
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (pushTimer) clearTimeout(pushTimer);
      unsubStore();
      supabase.removeChannel(channel);
    };
  }, [ready, session?.user?.id]);
}
