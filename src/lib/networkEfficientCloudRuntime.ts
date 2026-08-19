import { useEffect } from "react";

import {
  fetchPartner,
  pullMyData,
  pushMyData,
  useSession,
} from "./cloudSync";
import { mergeBixbo } from "./merge";
import {
  ensurePushWorker,
  notifPrefs,
  pushSupported,
  runNotificationChecks,
  syncPushState,
} from "./notifications";
import {
  getBixbo,
  hasAuthoritativeLocalSnapshot,
  replaceBixbo,
  setPartner,
  subscribeBixboChanges,
  type BixboData,
} from "./storage";

/**
 * BIXBO is local-first. Cloud persistence must never compete with taps, typing
 * or route changes. These delays intentionally coalesce a burst of local edits
 * into one latest-snapshot write.
 */
export const CLOUD_CHANGE_DEBOUNCE_MS = 5_000;
export const CLOUD_RECONCILE_INTERVAL_MS = 5 * 60_000;
export const CLOUD_RESUME_COOLDOWN_MS = 30_000;
export const NOTIFICATION_CHANGE_DEBOUNCE_MS = 15_000;
export const NOTIFICATION_SERVER_SYNC_MS = 5 * 60_000;
export const NOTIFICATION_INITIAL_SYNC_DELAY_MS = 30_000;

function browserIsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function privateSnapshotKey(data: BixboData): string {
  return JSON.stringify({ ...data, partner: undefined });
}

function logCloudError(scope: string, error: unknown): void {
  console.warn(`BIXBO ${scope}:`, error);
}

/**
 * Network-efficient cloud orchestration.
 *
 * The former hook pushed after 400 ms for every local store change, wrote both
 * private and partner projections even during rapid input, and refreshed the
 * partner projection from realtime echoes of our own write. On constrained
 * mobile networks that created several simultaneous Supabase requests and made
 * healthy local screens look frozen.
 *
 * This hook keeps the same local-first merge semantics but:
 * - serializes and coalesces local writes,
 * - skips an initial write when local and cloud already agree,
 * - performs reconciliation on a bounded cadence instead of every interaction,
 * - refreshes partner data only during reconciliation/foreground return.
 */
export function useNetworkEfficientCloudSync(): void {
  const { session, ready } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!ready) return;

    if (!userId) {
      setPartner(undefined);
      return;
    }

    let stopped = false;
    let pendingPush: BixboData | null = null;
    let pushTimer: number | null = null;
    let pushInFlight: Promise<void> | null = null;
    let reconcileInFlight: Promise<void> | null = null;
    let lastCloudSnapshotKey: string | null = null;
    let lastReconcileAt = 0;

    const runPush = (): Promise<void> => {
      if (pushInFlight) return pushInFlight;

      pushInFlight = (async () => {
        while (!stopped && pendingPush) {
          if (browserIsOffline()) return;

          const payload = pendingPush;
          pendingPush = null;
          const key = privateSnapshotKey(payload);

          if (key === lastCloudSnapshotKey) continue;

          try {
            await pushMyData(payload);
            lastCloudSnapshotKey = key;
          } catch (error) {
            // Keep only the newest snapshot. A later local edit may already
            // have replaced this payload while the request was in flight.
            if (!pendingPush) pendingPush = payload;
            throw error;
          }
        }
      })().finally(() => {
        pushInFlight = null;
      });

      return pushInFlight;
    };

    const schedulePush = (data: BixboData, delay = CLOUD_CHANGE_DEBOUNCE_MS): void => {
      pendingPush = data;
      if (pushTimer) window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => {
        pushTimer = null;
        void runPush().catch((error) => logCloudError("cloud push", error));
      }, delay);
    };

    const refreshPartner = async (): Promise<void> => {
      try {
        const partner = await fetchPartner();
        if (!stopped) setPartner(partner ?? undefined);
      } catch (error) {
        logCloudError("partner refresh", error);
      }
    };

    const reconcile = (): Promise<void> => {
      if (reconcileInFlight) return reconcileInFlight;

      reconcileInFlight = (async () => {
        if (stopped || browserIsOffline()) return;
        lastReconcileAt = Date.now();

        const hadLocalSnapshot = hasAuthoritativeLocalSnapshot();
        const remote = await pullMyData();
        if (stopped) return;

        // Read local state after the network request so edits made while the
        // request was in flight are included in the merge.
        const currentLocal = getBixbo();

        if (remote) {
          const remoteKey = privateSnapshotKey(remote);
          const merged = mergeBixbo(currentLocal, remote, {
            legacyLocalCanonical: hadLocalSnapshot,
          });
          const reconciled = { ...merged, partner: currentLocal.partner };
          const reconciledKey = privateSnapshotKey(reconciled);
          const currentLocalKey = privateSnapshotKey(currentLocal);

          lastCloudSnapshotKey = remoteKey;
          if (reconciledKey !== currentLocalKey) {
            replaceBixbo(reconciled, "remote");
          }
          if (reconciledKey !== remoteKey) schedulePush(reconciled);
        } else {
          lastCloudSnapshotKey = null;
          schedulePush(currentLocal, 1_500);
        }

        await refreshPartner();
      })()
        .catch((error) => logCloudError("cloud reconcile", error))
        .finally(() => {
          reconcileInFlight = null;
        });

      return reconcileInFlight;
    };

    void reconcile();

    const unsubscribeStore = subscribeBixboChanges((nextData, reason) => {
      if (reason !== "local") return;
      schedulePush(nextData);
    });

    const onOnline = () => {
      if (pendingPush) void runPush().catch((error) => logCloudError("online push retry", error));
      if (Date.now() - lastReconcileAt >= CLOUD_RESUME_COOLDOWN_MS) void reconcile();
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (pendingPush) void runPush().catch((error) => logCloudError("visible push retry", error));
      if (Date.now() - lastReconcileAt >= CLOUD_RESUME_COOLDOWN_MS) void reconcile();
    };

    const reconcileTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reconcile();
    }, CLOUD_RECONCILE_INTERVAL_MS);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      if (pushTimer) window.clearTimeout(pushTimer);
      window.clearInterval(reconcileTimer);
      pendingPush = null;
      unsubscribeStore();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, userId]);
}

/**
 * Remote reminder state is eventually consistent and does not need to be sent
 * after every diary mutation. Local reminder checks still run every minute;
 * server profile updates are coalesced and capped to a five-minute cadence.
 */
export function useNetworkEfficientNotificationRuntime(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !pushSupported()) return;

    let stopped = false;
    let lastServerSyncAt = 0;
    let serverSyncTimer: number | null = null;

    const localTick = () => {
      if (stopped) return;
      void runNotificationChecks().catch((error) => logCloudError("local notifications", error));
    };

    const runServerSync = async (): Promise<void> => {
      if (stopped || browserIsOffline()) return;
      if (Notification.permission !== "granted") return;
      if (!notifPrefs(getBixbo()).enabled) return;
      if (Date.now() - lastServerSyncAt < NOTIFICATION_SERVER_SYNC_MS) return;

      // Reserve the cadence before awaiting the network call so multiple
      // lifecycle/store events cannot launch parallel syncs.
      lastServerSyncAt = Date.now();
      try {
        await syncPushState();
      } catch (error) {
        // A failed sync must remain retryable instead of suppressing attempts
        // for the entire five-minute success cadence.
        lastServerSyncAt = 0;
        logCloudError("notification server sync", error);
      }
    };

    const scheduleServerSync = (delay: number): void => {
      if (serverSyncTimer) window.clearTimeout(serverSyncTimer);
      serverSyncTimer = window.setTimeout(() => {
        serverSyncTimer = null;
        void runServerSync();
      }, delay);
    };

    if (Notification.permission === "granted" && notifPrefs(getBixbo()).enabled) {
      void ensurePushWorker();
      scheduleServerSync(NOTIFICATION_INITIAL_SYNC_DELAY_MS);
    }

    const firstLocalTick = window.setTimeout(localTick, 4_000);
    const localInterval = window.setInterval(localTick, 60_000);

    const unsubscribeStore = subscribeBixboChanges((_nextData, reason) => {
      if (reason !== "local") return;
      scheduleServerSync(NOTIFICATION_CHANGE_DEBOUNCE_MS);
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      localTick();
      if (Date.now() - lastServerSyncAt >= NOTIFICATION_SERVER_SYNC_MS) scheduleServerSync(1_000);
    };

    const onOnline = () => {
      if (Date.now() - lastServerSyncAt >= NOTIFICATION_SERVER_SYNC_MS) scheduleServerSync(1_000);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      stopped = true;
      window.clearTimeout(firstLocalTick);
      window.clearInterval(localInterval);
      if (serverSyncTimer) window.clearTimeout(serverSyncTimer);
      unsubscribeStore();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);
}
