import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { mergeBixbo } from "./merge";
import {
  EMPTY,
  getBixbo,
  replaceBixbo,
  setPartner,
  subscribeBixboChanges,
  type BixboData,
  type DayLog,
  type PartnerData,
  type PostpartumDayLog,
  type PostpartumState,
  type PregnancyAppointment,
} from "./storage";

export interface CloudProfile {
  id: string;
  display_name: string | null;
  gender: string | null;
  pairing_code: string;
}

type PartnerSharedPayload = {
  dayLogs: BixboData["dayLogs"];
  meds: BixboData["meds"];
  medLog: BixboData["medLog"];
  cycle: BixboData["cycle"];
};

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
  const { data: { user } } = await supabase.auth.getUser();
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

function toPartnerSharedPayload(payload: BixboData): PartnerSharedPayload {
  const dayLogs: BixboData["dayLogs"] = {};
  for (const [date, log] of Object.entries(payload.dayLogs ?? {})) {
    const pain = log.pain?.length ? log.pain : undefined;
    const panic = log.panic?.length ? log.panic : undefined;
    const tetany = log.tetany?.length ? log.tetany : undefined;
    const extraMeds = log.extraMeds?.length ? log.extraMeds : undefined;
    const period = log.period || undefined;
    const periodInfo = log.periodInfo?.level ? log.periodInfo : undefined;
    if (pain || panic || tetany || extraMeds || period || periodInfo) {
      dayLogs[date] = { pain, panic, tetany, extraMeds, period, periodInfo };
    }
  }
  return {
    dayLogs,
    meds: payload.meds ?? [],
    medLog: payload.medLog ?? {},
    cycle: payload.cycle,
  };
}

function toPartnerView(shared: PartnerSharedPayload | null, name: string, gender?: string | null): PartnerData {
  const dayLogs: PartnerData["dayLogs"] = {};
  for (const [date, log] of Object.entries(shared?.dayLogs ?? {})) {
    if (log?.pain?.length || log?.panic?.length || log?.tetany?.length || log?.extraMeds?.length || log?.period || log?.periodInfo?.level) {
      dayLogs[date] = {
        pain: log.pain,
        panic: log.panic,
        tetany: log.tetany,
        extraMeds: log.extraMeds,
        period: log.period,
        periodInfo: log.periodInfo,
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
    cycle: shared?.cycle,
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
  const row = (data as Array<{ id: string; display_name: string | null; gender: string | null; data: PartnerSharedPayload | null }>)?.[0];
  if (!row) return null;
  return toPartnerView(row.data, row.display_name || "Partner", row.gender);
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeObjectArray<T extends object>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function normalizeRemotePostpartumState(value: unknown): PostpartumState {
  const raw = safeObject(value);
  const visits = safeObjectArray<PregnancyAppointment>(raw.visits).filter(
    (visit) => typeof visit.id === "string" && typeof visit.date === "string" && typeof visit.title === "string",
  );
  const deliveryType =
    raw.deliveryType === "vaginal" || raw.deliveryType === "csection" || raw.deliveryType === "assisted" || raw.deliveryType === "other"
      ? raw.deliveryType
      : undefined;
  const feedingMode =
    raw.feedingMode === "breast" || raw.feedingMode === "bottle" || raw.feedingMode === "mixed" ? raw.feedingMode : undefined;
  const birthWeight = Number(raw.babyBirthWeightKg);
  const active = Boolean(raw.active);
  return {
    active,
    birthDate: typeof raw.birthDate === "string" ? raw.birthDate : undefined,
    deliveryType,
    babyName: typeof raw.babyName === "string" ? raw.babyName : undefined,
    babyBirthWeightKg: Number.isFinite(birthWeight) ? birthWeight : undefined,
    feedingMode,
    visits,
    note: typeof raw.note === "string" ? raw.note : undefined,
    endedAt: active ? undefined : typeof raw.endedAt === "string" ? raw.endedAt : undefined,
  };
}

function normalizeRemotePostpartumDayLog(value: unknown): PostpartumDayLog | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const sleepHours = Number(raw.sleepHours);
  const babySleepHours = Number(raw.babySleepHours);
  const recovery = Number(raw.recovery);
  const csectionRecovery = Number(raw.csectionRecovery);
  const perinealHealing = Number(raw.perinealHealing);
  const bleeding =
    raw.bleeding === "" || raw.bleeding === "none" || raw.bleeding === "spotting" || raw.bleeding === "light" || raw.bleeding === "medium" || raw.bleeding === "heavy"
      ? raw.bleeding
      : undefined;
  return {
    ...(raw as PostpartumDayLog),
    bleeding,
    symptoms: safeStringArray(raw.symptoms),
    mood: safeStringArray(raw.mood),
    breastfeeding: safeObjectArray(raw.breastfeeding),
    pumping: safeObjectArray(raw.pumping),
    bottle: safeObjectArray(raw.bottle),
    diapers: safeObjectArray(raw.diapers),
    sleepHours: Number.isFinite(sleepHours) ? sleepHours : undefined,
    babySleepHours: Number.isFinite(babySleepHours) ? babySleepHours : undefined,
    recovery: Number.isFinite(recovery) ? recovery : undefined,
    csectionRecovery: Number.isFinite(csectionRecovery) ? csectionRecovery : undefined,
    perinealHealing: Number.isFinite(perinealHealing) ? perinealHealing : undefined,
    note: typeof raw.note === "string" ? raw.note : undefined,
  };
}

function normalizeRemoteSyncMeta(value: unknown): NonNullable<BixboData["syncMeta"]> {
  const raw = safeObject(value);
  const normalizeMap = (input: unknown): Record<string, number> => {
    const source = safeObject(input);
    const out: Record<string, number> = {};
    for (const [path, rawTimestamp] of Object.entries(source)) {
      const timestamp = Number(rawTimestamp);
      if (!path || !Number.isFinite(timestamp) || timestamp <= 0) continue;
      out[path] = timestamp;
    }
    return out;
  };
  return { updatedAt: normalizeMap(raw.updatedAt), deletedAt: normalizeMap(raw.deletedAt) };
}

function normalizeRemotePayload(value: unknown): BixboData {
  const raw = safeObject(value);
  const rawDayLogs = safeObject(raw.dayLogs);
  const dayLogs: Record<string, DayLog> = {};
  for (const [date, rawLog] of Object.entries(rawDayLogs)) {
    if (!rawLog || typeof rawLog !== "object" || Array.isArray(rawLog)) continue;
    const log = rawLog as DayLog;
    const postpartum = normalizeRemotePostpartumDayLog((rawLog as Record<string, unknown>).postpartum);
    dayLogs[date] = { ...log, postpartum };
  }
  return {
    ...EMPTY,
    ...(raw as Partial<BixboData>),
    dayLogs,
    postpartum: normalizeRemotePostpartumState(raw.postpartum),
    tasks: Array.isArray(raw.tasks) ? (raw.tasks as BixboData["tasks"]) : [],
    events: Array.isArray(raw.events) ? (raw.events as BixboData["events"]) : [],
    meds: Array.isArray(raw.meds) ? (raw.meds as BixboData["meds"]) : [],
    folders: Array.isArray(raw.folders) ? (raw.folders as BixboData["folders"]) : EMPTY.folders,
    notebook: Array.isArray(raw.notebook) ? (raw.notebook as BixboData["notebook"]) : [],
    labs: Array.isArray(raw.labs) ? (raw.labs as NonNullable<BixboData["labs"]>) : [],
    docs: Array.isArray(raw.docs) ? (raw.docs as NonNullable<BixboData["docs"]>) : [],
    diagnoses: Array.isArray(raw.diagnoses) ? (raw.diagnoses as NonNullable<BixboData["diagnoses"]>) : [],
    deletedIds: Array.isArray(raw.deletedIds) ? (raw.deletedIds as NonNullable<BixboData["deletedIds"]>) : [],
    syncMeta: normalizeRemoteSyncMeta(raw.syncMeta),
  };
}

export async function pullMyData(): Promise<BixboData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("pullMyData", error);
    throw error;
  }
  return data?.data ? normalizeRemotePayload(data.data) : null;
}

let _lastPushedJson: string | null = null;

export async function pushMyData(payload: BixboData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const safePayload = normalizeRemotePayload(payload);
  const privatePayload = { ...safePayload, partner: undefined };
  const partnerPayload = toPartnerSharedPayload(safePayload);
  _lastPushedJson = JSON.stringify(privatePayload);
  const [privateResult, sharedResult] = await Promise.all([
    supabase.from("user_data").upsert({ user_id: user.id, data: privatePayload as never }),
    supabase.from("partner_shared_data").upsert({ user_id: user.id, data: partnerPayload as never }),
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

const PENDING_SYNC_KEY = "bixbo:pending-cloud-sync";

function setPendingCloudSync(pending: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (pending) window.localStorage.setItem(PENDING_SYNC_KEY, "1");
    else window.localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingCloudSync(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PENDING_SYNC_KEY) === "1";
  } catch {
    return false;
  }
}

function browserIsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

let _flushingPromise: Promise<void> | null = null;

export async function flushMyDataPush(): Promise<void> {
  if (_flushingPromise) return _flushingPromise;
  setPendingCloudSync(true);
  _flushingPromise = (async () => {
    try {
      if (browserIsOffline()) return;
      await pushMyData(getBixbo());
      setPendingCloudSync(false);
    } catch (error) {
      setPendingCloudSync(true);
      console.error("flushMyDataPush", error);
    } finally {
      _flushingPromise = null;
    }
  })();
  return _flushingPromise;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        setSession(data.session);
      })
      .catch((error) => {
        console.error("useSession getSession", error);
        setSession(null);
      })
      .finally(() => {
        setReady(true);
      });
    return () => subscription.subscription.unsubscribe();
  }, []);
  return { session, ready, user: session?.user ?? null };
}

export function useCloudSync() {
  const { session, ready } = useSession();
  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setPartner(undefined);
      return;
    }
    const userId = session.user.id;
    let cancelled = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    let queuedPushData: BixboData | null = null;
    let pushInFlight: Promise<void> | null = null;

    const runPushQueue = (): Promise<void> => {
      if (pushInFlight) return pushInFlight;
      pushInFlight = (async () => {
        while (!cancelled && queuedPushData) {
          if (browserIsOffline()) {
            setPendingCloudSync(true);
            return;
          }
          const payload = queuedPushData;
          queuedPushData = null;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || user.id !== userId || cancelled) {
              queuedPushData = null;
              return;
            }
            await pushMyData(payload);
          } catch (error) {
            if (!queuedPushData) queuedPushData = payload;
            setPendingCloudSync(true);
            throw error;
          }
        }
        if (!cancelled && !queuedPushData) setPendingCloudSync(false);
      })().finally(() => {
        pushInFlight = null;
      });
      return pushInFlight;
    };

    const schedulePush = (nextData: BixboData, delay = 400): void => {
      queuedPushData = nextData;
      setPendingCloudSync(true);
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        void runPushQueue().catch((error) => {
          console.error("useCloudSync push", error);
        });
      }, delay);
    };

    const pushNow = async (nextData: BixboData): Promise<void> => {
      queuedPushData = nextData;
      setPendingCloudSync(true);
      await runPushQueue();
    };

    const refreshPartner = async (): Promise<void> => {
      try {
        const partner = await fetchPartner();
        if (!cancelled) setPartner(partner ?? undefined);
      } catch (error) {
        console.error("useCloudSync refreshPartner", error);
      }
    };

    void (async () => {
      try {
        await ensureProfile();
        const remote = await pullMyData();
        if (cancelled) return;
        const currentLocal = getBixbo();
        if (remote) {
          const safeRemote = normalizeRemotePayload(remote);
          const merged = mergeBixbo(currentLocal, safeRemote);
          const reconciled = { ...merged, partner: currentLocal.partner };
          replaceBixbo(reconciled, "remote");
          await pushNow(reconciled);
        } else {
          await pushNow(currentLocal);
        }
      } catch (error) {
        setPendingCloudSync(true);
        console.error("useCloudSync guarded initial sync", error);
      }
      if (!cancelled) await refreshPartner();
    })();

    const unsubscribeStore = subscribeBixboChanges((nextData, reason) => {
      if (reason !== "local") return;
      schedulePush(nextData);
    });

    const retryPending = (): void => {
      if (cancelled || browserIsOffline()) return;
      if (!hasPendingCloudSync() && !queuedPushData) return;
      queuedPushData = getBixbo();
      setPendingCloudSync(true);
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      void runPushQueue().catch((error) => {
        console.error("useCloudSync retry", error);
      });
    };

    const retryWhenVisible = (): void => {
      if (document.visibilityState === "visible") retryPending();
    };

    const channel = supabase
      .channel(`bixbo-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${userId}` }, (payload) => {
        try {
          const incomingRaw = (payload.new as { data?: unknown } | undefined)?.data;
          if (!incomingRaw) return;
          const incoming = normalizeRemotePayload(incomingRaw);
          const incomingJson = JSON.stringify({ ...incoming, partner: undefined });
          if (incomingJson === _lastPushedJson) return;
          const currentLocal = getBixbo();
          const merged = mergeBixbo(currentLocal, incoming);
          const reconciled = { ...merged, partner: currentLocal.partner };
          replaceBixbo(reconciled, "remote");
          const mergedJson = JSON.stringify({ ...normalizeRemotePayload(reconciled), partner: undefined });
          if (mergedJson !== incomingJson) schedulePush(reconciled);
        } catch (error) {
          console.error("useCloudSync realtime user_data", error);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_shared_data" }, () => {
        void refreshPartner();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_links" }, () => {
        void refreshPartner();
      })
      .subscribe();

    window.addEventListener("online", retryPending);
    document.addEventListener("visibilitychange", retryWhenVisible);
    if (!browserIsOffline()) retryPending();

    return () => {
      cancelled = true;
      if (pushTimer) clearTimeout(pushTimer);
      queuedPushData = null;
      unsubscribeStore();
      window.removeEventListener("online", retryPending);
      document.removeEventListener("visibilitychange", retryWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [ready, session?.user?.id]);
}
