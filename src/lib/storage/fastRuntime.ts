import { useEffect, useSyncExternalStore } from "react";

import { EMPTY } from "./defaults";
import { isPlainRecord, normalizeSyncMetadata } from "./migrations";
import * as base from "./runtime";
import type { BixboData, DayLog, PartnerData, SyncMetadata } from "./types";

const listeners = new Set<() => void>();
const changeListeners = new Set<(data: BixboData, reason: "local" | "remote") => void>();

let state: BixboData = EMPTY;
let hydrated = false;

const LARGE_MAP_ROOTS = new Set([
  "dayLogs",
  "dayNotes",
  "todos",
  "medLog",
  "medLogTimes",
  "medNames",
]);

function notify(): void {
  for (const listener of listeners) listener();
}

function mirrorIntoBase(next: BixboData): void {
  const target = base._state as BixboData & Record<string, unknown>;
  const source = next as BixboData & Record<string, unknown>;

  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key];
  }
  Object.assign(target, source);
}

function syncFromBase(): BixboData {
  state = base.getBixbo();
  hydrated = true;
  return state;
}

export function hydrate(): void {
  const previous = state;
  base.hydrate();
  const next = syncFromBase();
  if (next !== previous) notify();
}

function ensureHydrated(): BixboData {
  if (!hydrated) hydrate();
  return state;
}

function recordChangedMap(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  root: string,
  ctx: base.LocalSyncDiffContext,
): void {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const before = previous[key];
    const after = next[key];
    if (Object.is(before, after)) continue;
    base.recordLocalSyncDiff(before, after, base.syncChildPath(root, key), ctx);
  }
}

/**
 * Local UI updates already start from a canonical hydrated BixboData snapshot.
 * Keep structural sharing intact and diff only top-level branches that actually
 * changed. Large date-keyed maps are narrowed again to the changed date/key.
 * This avoids re-migrating and recursively comparing the complete health
 * history for every Log/Delete interaction.
 */
function withFastLocalSyncMetadata(previous: BixboData, next: BixboData): BixboData {
  const previousMeta = normalizeSyncMetadata(previous.syncMeta);
  const nextMeta = normalizeSyncMetadata(next.syncMeta);
  const meta: SyncMetadata = {
    updatedAt: base.mergeSyncTimestampMaps(previousMeta.updatedAt, nextMeta.updatedAt),
    deletedAt: base.mergeSyncTimestampMaps(previousMeta.deletedAt, nextMeta.deletedAt),
  };
  const deletedIds = new Set([...(previous.deletedIds ?? []), ...(next.deletedIds ?? [])]);
  const restoredIds = new Set<string>();
  const ctx: base.LocalSyncDiffContext = {
    meta,
    now: base.nextLocalSyncTimestamp(meta),
    deletedIds,
    restoredIds,
  };

  const previousRecord = previous as BixboData & Record<string, unknown>;
  const nextRecord = next as BixboData & Record<string, unknown>;
  const roots = new Set([...Object.keys(previousRecord), ...Object.keys(nextRecord)]);

  for (const root of roots) {
    if (root === "syncMeta" || root === "deletedIds" || root === "deletedCustom" || root === "partner") continue;

    const before = previousRecord[root];
    const after = nextRecord[root];
    if (Object.is(before, after)) continue;

    if (LARGE_MAP_ROOTS.has(root) && isPlainRecord(before) && isPlainRecord(after)) {
      recordChangedMap(before, after, root, ctx);
      continue;
    }

    base.recordLocalSyncDiff(before, after, root, ctx);
  }

  for (const id of restoredIds) deletedIds.delete(id);

  return {
    ...next,
    deletedIds: Array.from(deletedIds),
    syncMeta: {
      updatedAt: base.pruneSyncTimestampMap(meta.updatedAt),
      deletedAt: meta.deletedAt,
    },
  };
}

function commitLocal(next: BixboData): void {
  const previous = ensureHydrated();
  base.protectAgainstLargeDataLoss(previous, next, "before-local-data-reduction");
  const committed = withFastLocalSyncMetadata(previous, next);

  state = committed;
  mirrorIntoBase(committed);
  base.writeDeviceQuickLogPrefs(committed);
  base.persist();
  base.emit();
  notify();
  for (const listener of changeListeners) listener(committed, "local");
}

export function setBixbo(updater: (data: BixboData) => BixboData): void {
  const previous = ensureHydrated();
  const next = updater(previous);
  if (next === previous) return;
  commitLocal(next);
}

export function replaceBixbo(data: BixboData, reason: "local" | "remote" = "local"): void {
  if (reason === "local") {
    commitLocal(data);
    return;
  }

  // Cloud reconciliation is comparatively rare and remains on the defensive
  // migration path. Once normalized, refresh the fast UI snapshot from it.
  base.replaceBixbo(data, "remote");
  state = base.getBixbo();
  hydrated = true;
  notify();
  for (const listener of changeListeners) listener(state, "remote");
}

export function setPartner(partner: PartnerData | undefined): void {
  const previous = ensureHydrated();
  const next = { ...previous, partner };
  state = next;
  mirrorIntoBase(next);
  base.persist();
  base.emit();
  notify();
}

export function getBixbo(): BixboData {
  return ensureHydrated();
}

export function subscribeBixboChanges(
  listener: (data: BixboData, reason: "local" | "remote") => void,
): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function useBixbo() {
  useEffect(() => {
    hydrate();
  }, []);

  const data = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => EMPTY,
  );

  useEffect(() => {
    if (!hydrated) return;
    const map = { sm: "14px", md: "16px", lg: "18px", xl: "20px" } as const;
    document.documentElement.style.fontSize = map[data.settings.textSize] ?? "16px";
  }, [data.settings.textSize]);

  return {
    data,
    update: setBixbo,
    replace: (next: BixboData) => replaceBixbo(next, "local"),
    hydrated,
  };
}

export function updateDayLog(
  update: (updater: (data: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("BIXBO rejected an invalid day-log date key:", date);
    return;
  }

  update((data) => ({
    ...data,
    dayLogs: {
      ...data.dayLogs,
      [date]: base.pruneOrphanedAdminFields(patch(data.dayLogs[date] ?? {})),
    },
  }));
}
