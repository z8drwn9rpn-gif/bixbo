import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_ACCOUNT_PRIVACY_PREFS,
  DEFAULT_BACKUP_PREFS,
  DEFAULT_TRACKING_PREFS,
  DEFAULT_UNIT_PREFS,
  settingsFromLegacyHealthPreferences,
  type AccountPrivacyPreferences,
  type BackupPreferences,
  type TrackingPreferences,
  type UnitPreferences,
} from "../preferences";
import type { PeriodLevel } from "../domain/cycle";
import { BIXBO_LEGACY_STORAGE_KEY, BIXBO_STORAGE_KEY, DEFAULT_FOLDERS, EMPTY, INSTALL_ORIGIN_KEY, KEY, LEGACY_HEALTH_PREFS_KEY, LEGACY_KEY, SAFETY_BACKUP_KEY, SAFETY_BACKUP_MAX_BYTES } from "./defaults";
import type { BixboData, DayLog, PartnerData, SyncMetadata } from "./types";
import { freshEmptyState, isPlainRecord, migrate, normalizeSyncMetadata, safeRecord } from "./migrations";

export function hasStoredBixboSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY));
  } catch {
    return false;
  }
}

export const clearBixboLocalStorage = (): void => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(BIXBO_STORAGE_KEY);
  window.localStorage.removeItem(BIXBO_LEGACY_STORAGE_KEY);
  _snapshotWasPresentAtHydrate = false;
  _legacyLocalCanonicalEligible = false;
  _localEditedSinceHydrate = false;
  try {
    window.localStorage.setItem(INSTALL_ORIGIN_KEY, "fresh");
  } catch {
    // Ignore storage failures while clearing local BIXBO data.
  }
};

export let _state: BixboData = freshEmptyState();

export let _hydrated = false;

export function rawSnapshotHasMeaningfulUserData(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const recordCount = (key: string) => {
      const v = value[key];
      return v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v as Record<string, unknown>).length : 0;
    };
    const arrayCount = (key: string) => Array.isArray(value[key]) ? (value[key] as unknown[]).length : 0;

    if (["dayLogs", "dayNotes", "todos", "medLog", "medLogTimes", "medNames"].some((key) => recordCount(key) > 0)) return true;
    if (["tasks", "events", "meds", "notebook", "labs", "docs", "diagnoses", "deletedIds"].some((key) => arrayCount(key) > 0)) return true;

    const custom = safeRecord(value.custom);
    if (Object.values(custom).some((entry) => Array.isArray(entry) && entry.length > 0)) return true;

    const deletedCustom = safeRecord(value.deletedCustom);
    if (Object.values(deletedCustom).some((entry) => Array.isArray(entry) && entry.length > 0)) return true;

    const syncMeta = safeRecord(value.syncMeta);
    if (Object.keys(safeRecord(syncMeta.updatedAt)).length || Object.keys(safeRecord(syncMeta.deletedAt)).length) return true;

    const cycle = safeRecord(value.cycle);
    if (typeof cycle.lastPeriodStart === "string" || typeof cycle.lastPeriodEnd === "string") return true;

    const profile = safeRecord(value.profile);
    if (Object.values(profile).some((entry) => {
      if (Array.isArray(entry)) return entry.length > 0;
      if (entry && typeof entry === "object") return Object.keys(entry as Record<string, unknown>).length > 0;
      return entry !== undefined && entry !== null && entry !== "";
    })) return true;

    const pregnancy = safeRecord(value.pregnancy);
    if (pregnancy.active === true || typeof pregnancy.lmp === "string" || typeof pregnancy.dueDate === "string" || typeof pregnancy.endedAt === "string") return true;
    if (["hospitalBag", "vaccinations", "supplements", "appointments"].some((key) => Array.isArray(pregnancy[key]) && (pregnancy[key] as unknown[]).length > 0)) return true;

    const postpartum = safeRecord(value.postpartum);
    if (postpartum.active === true || typeof postpartum.birthDate === "string" || typeof postpartum.endedAt === "string") return true;
    if (Array.isArray(postpartum.visits) && postpartum.visits.length > 0) return true;

    const patterns = safeRecord(value.patterns);
    if (isPlainRecord(patterns.activeTreatment)) return true;
    if (Array.isArray(patterns.treatmentArchive) && patterns.treatmentArchive.length > 0) return true;

    const settings = safeRecord(value.settings);
    if (typeof settings.userName === "string" && settings.userName.trim()) return true;
    if (typeof settings.birthControlSince === "string" && settings.birthControlSince) return true;
    if (typeof settings.pairingCode === "string" && settings.pairingCode) return true;
    if (Array.isArray(settings.customQuickTags) && settings.customQuickTags.length > 0) return true;
    if (Array.isArray(settings.hiddenQuickTags) && settings.hiddenQuickTags.length > 0) return true;
    if (Array.isArray(settings.quickTagOrder) && settings.quickTagOrder.length > 0) return true;

    const rawTracking = safeRecord(settings.tracking);
    const tracking = { ...DEFAULT_TRACKING_PREFS, ...rawTracking } as TrackingPreferences;
    if (JSON.stringify(tracking) !== JSON.stringify(DEFAULT_TRACKING_PREFS)) return true;
    const rawUnits = safeRecord(settings.units);
    const units = { ...DEFAULT_UNIT_PREFS, ...rawUnits } as UnitPreferences;
    if (JSON.stringify(units) !== JSON.stringify(DEFAULT_UNIT_PREFS)) return true;

    const folders = Array.isArray(value.folders) ? value.folders : [];
    if (folders.length && JSON.stringify(folders) !== JSON.stringify(DEFAULT_FOLDERS)) return true;

    return false;
  } catch {
    // A malformed snapshot should never be trusted as the canonical copy.
    return false;
  }
}

export let _snapshotWasPresentAtHydrate = false;

export let _legacyLocalCanonicalEligible = false;

export let _localEditedSinceHydrate = false;

export const listeners = new Set<() => void>();

export const changeListeners = new Set<(d: BixboData, reason: "local" | "remote") => void>();

export type SafetyBackupEnvelope = {
  createdAt: string;
  reason: string;
  score: number;
  data: BixboData;
};

export function dataProtectionScore(data: BixboData): number {
  const recordSize = (value: unknown) => (isPlainRecord(value) ? Object.keys(value).length : 0);
  const arraySize = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  let score = 0;
  score += recordSize(data.dayLogs) * 4;
  score += recordSize(data.dayNotes) * 2;
  score += recordSize(data.todos);
  score += recordSize(data.medLog) * 2;
  score += arraySize(data.meds) * 4;
  score += arraySize(data.tasks) + arraySize(data.events);
  score += arraySize(data.notebook) * 2;
  score += arraySize(data.labs) * 3 + arraySize(data.docs) * 3 + arraySize(data.diagnoses) * 3;
  score += arraySize(data.patterns?.treatmentArchive) * 5;
  if (data.patterns?.activeTreatment) score += 5;
  if (data.pregnancy?.active || data.pregnancy?.lmp || data.pregnancy?.dueDate) score += 5;
  if (data.postpartum?.active || data.postpartum?.birthDate) score += 5;
  const profile = safeRecord(data.profile);
  score += Object.values(profile).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (isPlainRecord(value)) return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== "";
  }).length * 2;
  return score;
}

export function storeSafetyBackup(data: BixboData, reason: string, force = false): boolean {
  if (typeof window === "undefined") return false;
  try {
    const normalized = migrate(data);
    const score = dataProtectionScore(normalized);
    if (score <= 0) return false;

    const existingRaw = window.localStorage.getItem(SAFETY_BACKUP_KEY);
    if (!force && existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as Partial<SafetyBackupEnvelope>;
        if (Number(existing.score ?? 0) >= score) return true;
      } catch {
        // Replace malformed backup with a valid snapshot below.
      }
    }

    const envelope: SafetyBackupEnvelope = {
      createdAt: new Date().toISOString(),
      reason,
      score,
      data: normalized,
    };
    const serialized = JSON.stringify(envelope);
    if (serialized.length > SAFETY_BACKUP_MAX_BYTES) return false;
    window.localStorage.setItem(SAFETY_BACKUP_KEY, serialized);
    return true;
  } catch (error) {
    console.error("BIXBO safety backup could not be saved.", error);
    return false;
  }
}

export function createBixboSafetyBackup(reason = "manual"): boolean {
  hydrate();
  return storeSafetyBackup(_state, reason, true);
}

export function getBixboSafetyBackup(): { createdAt: string; reason: string; data: BixboData } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAFETY_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SafetyBackupEnvelope>;
    if (!parsed.data || typeof parsed.createdAt !== "string") return null;
    return {
      createdAt: parsed.createdAt,
      reason: typeof parsed.reason === "string" ? parsed.reason : "safety backup",
      data: migrate(parsed.data),
    };
  } catch {
    return null;
  }
}

export function protectAgainstLargeDataLoss(previous: BixboData, next: BixboData, reason: string): void {
  const before = dataProtectionScore(previous);
  const after = dataProtectionScore(next);
  const loss = before - after;
  if (before > 0 && loss > 0 && (loss >= 5 || after <= before * 0.7)) {
    storeSafetyBackup(previous, reason);
  }
}

export const DEVICE_QUICK_LOG_KEY = "bixbo-device-quick-log-v1";

export type DeviceQuickLogPrefs = Pick<BixboData["settings"], "quickTagOrder" | "hiddenQuickTags" | "customQuickTags">;

export function readDeviceQuickLogPrefs(): DeviceQuickLogPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_QUICK_LOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceQuickLogPrefs;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDeviceQuickLogPrefs(data: BixboData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_QUICK_LOG_KEY, JSON.stringify({
      quickTagOrder: data.settings.quickTagOrder ?? [],
      hiddenQuickTags: data.settings.hiddenQuickTags ?? [],
      customQuickTags: data.settings.customQuickTags ?? [],
    } satisfies DeviceQuickLogPrefs));
  } catch {
    // Device storage may be unavailable in private/restricted browser contexts.
  }
}

export function applyDeviceQuickLogPrefs(data: BixboData): BixboData {
  const local = readDeviceQuickLogPrefs();
  if (!local) return data;
  return {
    ...data,
    settings: {
      ...data.settings,
      quickTagOrder: local.quickTagOrder ?? [],
      hiddenQuickTags: local.hiddenQuickTags ?? [],
      customQuickTags: local.customQuickTags ?? [],
    },
  };
}

export function emit() {
  listeners.forEach((l) => l());
}

export function hydrate() {
  if (_hydrated || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    _snapshotWasPresentAtHydrate = Boolean(raw);

    // v3 needs to distinguish a genuine pre-v3 installation from a brand-new
    // browser that merely persisted an empty/default snapshot before sign-in.
    // Persist the origin on the very first v3 hydrate so a later reload cannot
    // accidentally turn a fresh install into the canonical legacy copy.
    let installOrigin = window.localStorage.getItem(INSTALL_ORIGIN_KEY);
    if (installOrigin !== "existing" && installOrigin !== "fresh") {
      installOrigin = rawSnapshotHasMeaningfulUserData(raw) ? "existing" : "fresh";
      window.localStorage.setItem(INSTALL_ORIGIN_KEY, installOrigin);
    }
    _legacyLocalCanonicalEligible = installOrigin === "existing";

    if (raw && rawSnapshotHasMeaningfulUserData(raw)) {
      try {
        storeSafetyBackup(migrate(JSON.parse(raw)), "before-app-migration");
      } catch {
        // A malformed main snapshot must never overwrite an existing good safety backup.
      }
    }

    _state = applyDeviceQuickLogPrefs(raw ? migrate(JSON.parse(raw)) : freshEmptyState());

    const legacyPrefsRaw = window.localStorage.getItem(LEGACY_HEALTH_PREFS_KEY);
    if (legacyPrefsRaw) {
      try {
        const legacySettings = settingsFromLegacyHealthPreferences(JSON.parse(legacyPrefsRaw));
        const rawStoredSettings = raw ? safeRecord(JSON.parse(raw).settings) : {};
        _state = migrate({
          ..._state,
          settings: {
            ..._state.settings,
            tracking: rawStoredSettings.tracking ? _state.settings.tracking : legacySettings.tracking ?? _state.settings.tracking,
            units: rawStoredSettings.units ? _state.settings.units : legacySettings.units ?? _state.settings.units,
            privacy: rawStoredSettings.privacy ? _state.settings.privacy : legacySettings.privacy ?? _state.settings.privacy,
            backup: rawStoredSettings.backup ? _state.settings.backup : legacySettings.backup ?? _state.settings.backup,
            notif: rawStoredSettings.notif ? _state.settings.notif : legacySettings.notif ?? _state.settings.notif,
          },
        });
      } catch {
        // Malformed legacy preferences must never block the main health data.
      }
    }
  } catch (error) {
    console.error("BIXBO local data could not be loaded; using a safe empty state.", error);
    _state = freshEmptyState();
  }
  _hydrated = true;
  emit();
}

export function persist() {
  if (typeof window === "undefined") return;
  // Never write before we've loaded what's already stored, otherwise an early
  // write (e.g. cloud sync clearing partner) would wipe saved data.
  if (!_hydrated) hydrate();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(_state));
  } catch (error) {
    console.error("BIXBO local data could not be saved.", error);
  }
}

export const SYNC_META_MAX_KEYS = 12000;

export let _lastLocalSyncTimestamp = 0;

export function encodeSyncSegment(value: string): string {
  return encodeURIComponent(value);
}

export function syncChildPath(base: string, key: string): string {
  const segment = encodeSyncSegment(key);
  return base ? `${base}/${segment}` : segment;
}

export function syncValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => syncValuesEqual(value, b[index]));
  }

  if (isPlainRecord(a) || isPlainRecord(b)) {
    if (!isPlainRecord(a) || !isPlainRecord(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) return false;
    return aKeys.every((key) => syncValuesEqual(a[key], b[key]));
  }

  return false;
}

export function isIdObject(value: unknown): value is { id: string } {
  return isPlainRecord(value) && typeof value.id === "string" && Boolean(value.id.trim());
}

export function arraysUseIds(previous: unknown, next: unknown): boolean {
  const arrays = [previous, next].filter(Array.isArray) as unknown[][];
  const populated = arrays.filter((items) => items.length > 0);
  return populated.length > 0 && populated.every((items) => items.every(isIdObject));
}

export function mergeSyncTimestampMaps(
  previous: Record<string, number> | undefined,
  next: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...(previous ?? {}) };
  for (const [path, timestamp] of Object.entries(next ?? {})) {
    const parsed = Number(timestamp);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    out[path] = Math.max(out[path] ?? 0, parsed);
  }
  return out;
}

export function nextLocalSyncTimestamp(meta: SyncMetadata): number {
  let seen = 0;
  for (const timestamp of Object.values(meta.updatedAt)) seen = Math.max(seen, timestamp);
  for (const timestamp of Object.values(meta.deletedAt)) seen = Math.max(seen, timestamp);
  const next = Math.max(Date.now(), _lastLocalSyncTimestamp + 1, seen + 1);
  _lastLocalSyncTimestamp = next;
  return next;
}

export function pruneSyncTimestampMap(map: Record<string, number>): Record<string, number> {
  const entries = Object.entries(map);
  if (entries.length <= SYNC_META_MAX_KEYS) return map;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, SYNC_META_MAX_KEYS));
}

export type LocalSyncDiffContext = {
  meta: SyncMetadata;
  now: number;
  deletedIds: Set<string>;
  restoredIds: Set<string>;
};

export function stampLocalUpdate(ctx: LocalSyncDiffContext, path: string): void {
  if (!path) return;
  ctx.meta.updatedAt[path] = ctx.now;
  delete ctx.meta.deletedAt[path];
}

export function stampLocalDelete(ctx: LocalSyncDiffContext, path: string): void {
  if (!path) return;
  ctx.meta.deletedAt[path] = ctx.now;
  delete ctx.meta.updatedAt[path];
}

export function recordLocalSyncDiff(
  previous: unknown,
  next: unknown,
  path: string,
  ctx: LocalSyncDiffContext,
): void {
  if (syncValuesEqual(previous, next)) return;

  if (Array.isArray(previous) || Array.isArray(next)) {
    if (arraysUseIds(previous, next)) {
      const previousItems = new Map(
        (Array.isArray(previous) ? previous : []).filter(isIdObject).map((item) => [item.id, item] as const),
      );
      const nextItems = new Map(
        (Array.isArray(next) ? next : []).filter(isIdObject).map((item) => [item.id, item] as const),
      );
      const ids = new Set([...previousItems.keys(), ...nextItems.keys()]);

      for (const id of ids) {
        const before = previousItems.get(id);
        const after = nextItems.get(id);
        const itemPath = syncChildPath(path, id);

        if (before && !after) {
          stampLocalDelete(ctx, itemPath);
          ctx.deletedIds.add(id);
          continue;
        }

        if (!before && after) {
          stampLocalUpdate(ctx, itemPath);
          ctx.restoredIds.add(id);
          continue;
        }

        if (before && after && !syncValuesEqual(before, after)) {
          stampLocalUpdate(ctx, itemPath);
          ctx.restoredIds.add(id);
        }
      }
      return;
    }

    if (next === undefined) stampLocalDelete(ctx, path);
    else stampLocalUpdate(ctx, path);
    return;
  }

  const previousRecord = isPlainRecord(previous) ? previous : undefined;
  const nextRecord = isPlainRecord(next) ? next : undefined;

  if (previousRecord || nextRecord) {
    if (!nextRecord) stampLocalDelete(ctx, path);
    else if (!previousRecord) stampLocalUpdate(ctx, path);

    const keys = new Set([...Object.keys(previousRecord ?? {}), ...Object.keys(nextRecord ?? {})]);

    for (const key of keys) {
      if (!path && (key === "syncMeta" || key === "deletedIds" || key === "deletedCustom" || key === "partner")) {
        continue;
      }

      recordLocalSyncDiff(previousRecord?.[key], nextRecord?.[key], syncChildPath(path, key), ctx);
    }
    return;
  }

  if (next === undefined) stampLocalDelete(ctx, path);
  else stampLocalUpdate(ctx, path);
}

export function withLocalSyncMetadata(previous: BixboData, next: BixboData): BixboData {
  const previousMeta = normalizeSyncMetadata(previous.syncMeta);
  const nextMeta = normalizeSyncMetadata(next.syncMeta);
  const meta: SyncMetadata = {
    updatedAt: mergeSyncTimestampMaps(previousMeta.updatedAt, nextMeta.updatedAt),
    deletedAt: mergeSyncTimestampMaps(previousMeta.deletedAt, nextMeta.deletedAt),
  };
  const deletedIds = new Set([...(previous.deletedIds ?? []), ...(next.deletedIds ?? [])]);
  const restoredIds = new Set<string>();
  const ctx: LocalSyncDiffContext = {
    meta,
    now: nextLocalSyncTimestamp(meta),
    deletedIds,
    restoredIds,
  };

  recordLocalSyncDiff(previous, next, "", ctx);

  // A deliberate re-add/edit of an id after a tombstone is allowed to win.
  // Path-level metadata remains authoritative; removing the legacy global id
  // keeps older sync clients from immediately deleting the restored entry.
  for (const id of restoredIds) deletedIds.delete(id);

  return {
    ...next,
    deletedIds: Array.from(deletedIds),
    syncMeta: {
      // Updated clocks are bounded for storage size, but deletion tombstones are
      // intentionally retained indefinitely. A very old cloud/device snapshot
      // must never be able to resurrect something the user explicitly deleted.
      updatedAt: pruneSyncTimestampMap(meta.updatedAt),
      deletedAt: meta.deletedAt,
    },
  };
}

export function hasAuthoritativeLocalSnapshot(): boolean {
  hydrate();
  // Only an installation that already had BIXBO data before the v3 migration
  // may canonicalize clock-less legacy Quick Tags/custom lists. A fresh
  // installation remains cloud-seeded even if it later writes an empty/default
  // local snapshot and reloads. Normal post-v3 edits still carry path clocks
  // and therefore do not require this legacy-only privilege.
  return _legacyLocalCanonicalEligible;
}

export function setBixbo(updater: (d: BixboData) => BixboData) {
  hydrate();
  _localEditedSinceHydrate = true;
  const previous = _state;
  const next = migrate(updater(_state));
  protectAgainstLargeDataLoss(previous, next, "before-local-data-reduction");
  _state = migrate(withLocalSyncMetadata(previous, next));
  writeDeviceQuickLogPrefs(_state);
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, "local"));
}

export function replaceBixbo(d: BixboData, reason: "local" | "remote" = "local") {
  hydrate();
  if (reason === "local") _localEditedSinceHydrate = true;
  const next = migrate(d);
  protectAgainstLargeDataLoss(_state, next, reason === "local" ? "before-local-replace" : "before-cloud-reconcile");
  _state = reason === "local"
    ? migrate(withLocalSyncMetadata(_state, next))
    : applyDeviceQuickLogPrefs(next);
  if (reason === "local") writeDeviceQuickLogPrefs(_state);
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, reason));
}

export function setPartner(partner: PartnerData | undefined) {
  hydrate();
  _state = { ..._state, partner };
  persist();
  emit();
}

export function getBixbo(): BixboData {
  hydrate();
  return _state;
}

export function subscribeBixboChanges(fn: (d: BixboData, reason: "local" | "remote") => void) {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

export function useBixbo() {
  useEffect(() => {
    hydrate();
  }, []);
  const data = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => _state,
    () => EMPTY,
  );
  useEffect(() => {
    if (!_hydrated) return;
    const map = { sm: "14px", md: "16px", lg: "18px", xl: "20px" } as const;
    document.documentElement.style.fontSize = map[data.settings.textSize] ?? "16px";
  }, [data.settings.textSize]);
  return { data, update: setBixbo, replace: (d: BixboData) => replaceBixbo(d, "local"), hydrated: _hydrated };
}

export function linkedCoreEntryIds(log: DayLog, featureId: string): Set<string> | null {
  const ids = (entries: Array<{ id: string }> | undefined) => new Set((entries ?? []).map((entry) => entry.id));
  switch (featureId) {
    case "pain": return ids(log.pain);
    case "tetany": return ids(log.tetany);
    case "panic": return ids(log.panic);
    case "heat": return ids(log.heat);
    case "food": return ids(log.food);
    case "bowel": return ids(log.bowel);
    case "sex": return ids(log.sex);
    case "workout": return ids(log.workout);
    case "meds": return ids(log.extraMeds);
    case "temp": return new Set([
      ...(log.temperatureEntries ?? []).map((entry) => entry.id),
      ...(log.weightEntries ?? []).map((entry) => entry.id),
    ]);
    default: return null;
  }
}

export function pruneOrphanedAdminFields(log: DayLog): DayLog {
  if (!log.adminFields) return log;
  let changed = false;
  const nextAdminFields: NonNullable<DayLog["adminFields"]> = {};

  Object.entries(log.adminFields).forEach(([featureId, entries]) => {
    const coreIds = linkedCoreEntryIds(log, featureId);
    if (coreIds == null) {
      nextAdminFields[featureId] = entries;
      return;
    }
    const kept = entries.filter((entry) => !entry.sourceEntryId || coreIds.has(entry.sourceEntryId));
    if (kept.length !== entries.length) changed = true;
    nextAdminFields[featureId] = kept;
  });

  return changed ? { ...log, adminFields: nextAdminFields } : log;
}

export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("BIXBO rejected an invalid day-log date key:", date);
    return;
  }

  update((d) => ({
    ...d,
    dayLogs: {
      ...d.dayLogs,
      [date]: pruneOrphanedAdminFields(patch(d.dayLogs[date] ?? {})),
    },
  }));
}
