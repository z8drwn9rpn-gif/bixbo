import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  getBixbo, replaceBixbo, setPartner, subscribeBixboChanges,
  type BixboData, type PartnerData,
} from "./storage";

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
  return { name, dayLogs, meds: bx?.meds ?? [], medLog: bx?.medLog ?? {}, cycle: bx?.cycle, gender: bx?.settings?.gender, importedAt: Date.now() };
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
export async function pushMyData(payload: BixboData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const stripped = { ...payload, partner: undefined };
  await supabase.from("user_data").upsert({ user_id: user.id, data: stripped as never });
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
      if (remote && Object.keys(remote.dayLogs ?? {}).length > 0) {
        // Merge remote wins for map fields; keep any local partner state fresh below
        replaceBixbo({ ...getBixbo(), ...remote, partner: getBixbo().partner }, "remote");
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
      pushTimer = setTimeout(() => { pushMyData(d).catch(console.error); }, 900);
    });

    // Realtime: refresh partner when their user_data changes or link changes
    const channel = supabase
      .channel(`bixbo-sync-${session.user.id}`)
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
