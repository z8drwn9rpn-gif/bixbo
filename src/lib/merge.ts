/* ------------------------------------------------------------------
 * Deep merge for BixboData used by cloud sync — conflict-safe.
 *
 * New writes carry per-path sync metadata from storage.ts. That gives us
 * deterministic last-write-wins semantics for edits, explicit clears,
 * medication untake, reproductive-state deactivation and deletions.
 * Legacy data without metadata still uses conservative deterministic fallbacks
 * so two devices converge instead of each preferring its own copy forever.
 * ------------------------------------------------------------------ */
import {
  EMPTY,
  type BixboData,
  type DayLog,
  type NoteFolder,
  type Note,
  type TaskEntry,
  type EventEntry,
  type Med,
  type CustomLists,
  type PostpartumDayLog,
  type PostpartumState,
  type PregnancyState,
  type PregnancyAppointment,
} from "./storage";

type WithId = { id: string; updatedAt?: number; createdAt?: number };
type SyncMeta = NonNullable<BixboData["syncMeta"]>;

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePostpartumDayLog(value: unknown): PostpartumDayLog | undefined {
  if (!isObj(value)) return undefined;

  const bleeding =
    value.bleeding === "" ||
    value.bleeding === "none" ||
    value.bleeding === "spotting" ||
    value.bleeding === "light" ||
    value.bleeding === "medium" ||
    value.bleeding === "heavy"
      ? value.bleeding
      : undefined;

  return {
    bleeding,
    symptoms: safeStringArray(value.symptoms),
    recovery: safeNumber(value.recovery),
    csectionRecovery: safeNumber(value.csectionRecovery),
    perinealHealing: safeNumber(value.perinealHealing),
    mood: safeStringArray(value.mood),
    sleepHours: safeNumber(value.sleepHours),
    breastfeeding: safeArray<NonNullable<PostpartumDayLog["breastfeeding"]>[number]>(value.breastfeeding).filter(
      isObj,
    ) as NonNullable<PostpartumDayLog["breastfeeding"]>,
    pumping: safeArray<NonNullable<PostpartumDayLog["pumping"]>[number]>(value.pumping).filter(isObj) as NonNullable<
      PostpartumDayLog["pumping"]
    >,
    bottle: safeArray<NonNullable<PostpartumDayLog["bottle"]>[number]>(value.bottle).filter(isObj) as NonNullable<
      PostpartumDayLog["bottle"]
    >,
    diapers: safeArray<NonNullable<PostpartumDayLog["diapers"]>[number]>(value.diapers).filter(isObj) as NonNullable<
      PostpartumDayLog["diapers"]
    >,
    babySleepHours: safeNumber(value.babySleepHours),
    note: typeof value.note === "string" ? value.note : undefined,
  };
}

function normalizePostpartumState(value: unknown): PostpartumState {
  const raw = isObj(value) ? value : {};

  const deliveryType =
    raw.deliveryType === "vaginal" ||
    raw.deliveryType === "csection" ||
    raw.deliveryType === "assisted" ||
    raw.deliveryType === "other"
      ? raw.deliveryType
      : undefined;

  const feedingMode =
    raw.feedingMode === "breast" || raw.feedingMode === "bottle" || raw.feedingMode === "mixed"
      ? raw.feedingMode
      : undefined;

  const visits = safeArray<PregnancyAppointment>(raw.visits).filter(
    (visit) =>
      isObj(visit) && typeof visit.id === "string" && typeof visit.date === "string" && typeof visit.title === "string",
  );

  return {
    active: Boolean(raw.active),
    birthDate: typeof raw.birthDate === "string" ? raw.birthDate : undefined,
    deliveryType,
    babyName: typeof raw.babyName === "string" ? raw.babyName : undefined,
    babyBirthWeightKg: safeNumber(raw.babyBirthWeightKg),
    feedingMode,
    visits,
    note: typeof raw.note === "string" ? raw.note : undefined,
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : undefined,
  };
}

function normalizePregnancyState(value: unknown): PregnancyState {
  const raw = isObj(value) ? value : {};
  const appointments = safeArray<PregnancyAppointment>(raw.appointments).filter(
    (visit) =>
      isObj(visit) && typeof visit.id === "string" && typeof visit.date === "string" && typeof visit.title === "string",
  );

  const checklist = (value: unknown): PregnancyState["hospitalBag"] =>
    safeArray<PregnancyState["hospitalBag"][number]>(value).filter(
      (item) => isObj(item) && typeof item.id === "string" && typeof item.text === "string",
    ) as PregnancyState["hospitalBag"];

  return {
    active: Boolean(raw.active),
    lmp: typeof raw.lmp === "string" ? raw.lmp : undefined,
    dueDate: typeof raw.dueDate === "string" ? raw.dueDate : undefined,
    startWeightKg: safeNumber(raw.startWeightKg),
    multiples: safeNumber(raw.multiples),
    hospitalBag: checklist(raw.hospitalBag),
    vaccinations: checklist(raw.vaccinations),
    supplements: checklist(raw.supplements),
    appointments,
    note: typeof raw.note === "string" ? raw.note : undefined,
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : undefined,
  };
}

/** Rough completeness score retained only as a legacy-data tie-breaker. */
function completeness(v: unknown): number {
  if (v == null) return 0;
  if (typeof v !== "object") return 1;
  let n = 0;
  for (const val of Object.values(v as Record<string, unknown>)) {
    if (val == null || val === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    n++;
  }
  return n;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  if (isObj(a) || isObj(b)) {
    if (!isObj(a) || !isObj(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) return false;
    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

function canonicalValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalValue(object[key])}`)
    .join(",")}}`;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function childPath(base: string, key: string): string {
  const segment = encodeSegment(key);
  return base ? `${base}/${segment}` : segment;
}

function normalizeMeta(value: BixboData["syncMeta"] | undefined): SyncMeta {
  const normalizeMap = (map: unknown): Record<string, number> => {
    if (!isObj(map)) return {};
    const out: Record<string, number> = {};
    for (const [path, raw] of Object.entries(map)) {
      const timestamp = Number(raw);
      if (path && Number.isFinite(timestamp) && timestamp > 0) out[path] = timestamp;
    }
    return out;
  };

  const raw: Record<string, unknown> = isObj(value) ? value : {};
  return {
    updatedAt: normalizeMap(raw.updatedAt),
    deletedAt: normalizeMap(raw.deletedAt),
  };
}

function mergeTimestampMaps(local: Record<string, number>, remote: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...remote };
  for (const [path, timestamp] of Object.entries(local)) out[path] = Math.max(out[path] ?? 0, timestamp);
  return out;
}

function mergeSyncMeta(local: BixboData["syncMeta"], remote: BixboData["syncMeta"]): SyncMeta {
  const l = normalizeMeta(local);
  const r = normalizeMeta(remote);
  return {
    updatedAt: mergeTimestampMaps(l.updatedAt, r.updatedAt),
    deletedAt: mergeTimestampMaps(l.deletedAt, r.deletedAt),
  };
}

let _localMeta: SyncMeta = { updatedAt: {}, deletedAt: {} };
let _remoteMeta: SyncMeta = { updatedAt: {}, deletedAt: {} };
let _legacyDeleted = new Set<string>();
let _restoredLegacyIds = new Set<string>();

function timestamp(meta: SyncMeta, kind: "updatedAt" | "deletedAt", path: string): number {
  return Number(meta[kind][path]) || 0;
}

function intrinsicTimestamp(value: unknown): number {
  if (!isObj(value)) return 0;
  const updatedAt = Number(value.updatedAt);
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt;
  const createdAt = Number(value.createdAt);
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0;
}

function clocksFor(path: string, local: unknown, remote: unknown) {
  return {
    lu: Math.max(timestamp(_localMeta, "updatedAt", path), intrinsicTimestamp(local)),
    ru: Math.max(timestamp(_remoteMeta, "updatedAt", path), intrinsicTimestamp(remote)),
    ld: timestamp(_localMeta, "deletedAt", path),
    rd: timestamp(_remoteMeta, "deletedAt", path),
  };
}

function hasSyncClock(path: string): boolean {
  return Boolean(
    timestamp(_localMeta, "updatedAt", path) ||
      timestamp(_remoteMeta, "updatedAt", path) ||
      timestamp(_localMeta, "deletedAt", path) ||
      timestamp(_remoteMeta, "deletedAt", path),
  );
}

function defaultAtPath(path: string): unknown {
  if (!path) return EMPTY;
  const segments = path.split("/").map((segment) => decodeURIComponent(segment));
  let current: unknown = EMPTY;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current.find((item) => isObj(item) && item.id === segment);
      if (current === undefined) return undefined;
      continue;
    }
    if (!isObj(current) || !(segment in current)) return undefined;
    current = current[segment];
  }

  return current;
}

function chooseAtomic(path: string, local: unknown, remote: unknown, useCompleteness = false): unknown {
  const localPresent = local !== undefined;
  const remotePresent = remote !== undefined;
  const { lu, ru, ld, rd } = clocksFor(path, local, remote);
  const latestDelete = Math.max(ld, rd);
  const latestUpdate = Math.max(lu, ru);

  // Deletion wins ties. A later explicit re-add/update wins an older tombstone.
  if (latestDelete > 0 && latestDelete >= latestUpdate) return undefined;

  if (lu > ru) return localPresent ? local : undefined;
  if (ru > lu) return remotePresent ? remote : undefined;

  if (!localPresent && !remotePresent) return undefined;
  if (!localPresent) return remote;
  if (!remotePresent) return local;
  if (deepEqual(local, remote)) return local;

  // Fresh-device defaults must never overwrite meaningful cloud data.
  const defaultValue = defaultAtPath(path);
  const localIsDefault = deepEqual(local, defaultValue);
  const remoteIsDefault = deepEqual(remote, defaultValue);
  if (localIsDefault !== remoteIsDefault) return localIsDefault ? remote : local;

  if (useCompleteness) {
    const lc = completeness(local);
    const rc = completeness(remote);
    if (lc !== rc) return lc > rc ? local : remote;
  }

  // Legacy conflict with no metadata: deterministic tie-break so merge(A,B)
  // and merge(B,A) converge on the same value instead of causing sync ping-pong.
  return canonicalValue(local) >= canonicalValue(remote) ? local : remote;
}

function isIdItem(value: unknown): value is WithId {
  return isObj(value) && typeof value.id === "string" && Boolean(value.id.trim());
}

function arraysUseIds(local: unknown, remote: unknown): boolean {
  const arrays = [local, remote].filter(Array.isArray) as unknown[][];
  const populated = arrays.filter((items) => items.length > 0);
  return populated.length > 0 && populated.every((items) => items.every(isIdItem));
}

/** Union id-keyed arrays using per-entry last-write/delete metadata. */
function unionById<T extends WithId>(local: unknown, remote: unknown, basePath: string): T[] {
  const l = Array.isArray(local) ? local.filter(isIdItem) : [];
  const r = Array.isArray(remote) ? remote.filter(isIdItem) : [];
  const localMap = new Map(l.map((item) => [item.id, item] as const));
  const remoteMap = new Map(r.map((item) => [item.id, item] as const));
  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const out: T[] = [];

  for (const id of ids) {
    const lv = localMap.get(id);
    const rv = remoteMap.get(id);
    const path = childPath(basePath, id);
    const { lu, ru, ld, rd } = clocksFor(path, lv, rv);
    const latestUpdate = Math.max(lu, ru);
    const latestDelete = Math.max(ld, rd);

    if (_legacyDeleted.has(id)) {
      // Old global tombstones have no timestamp. Keep honoring them unless the
      // new journal proves that the id was deliberately restored later.
      if (latestUpdate <= latestDelete || latestUpdate === 0) continue;
      _restoredLegacyIds.add(id);
    }

    const chosen = chooseAtomic(path, lv, rv, true);
    if (chosen && isIdItem(chosen)) out.push(chosen as T);
  }

  return out;
}

function dedupArray<T>(arr: T[] | undefined): T[] {
  if (!arr?.length) return arr ?? [];
  const map = new Map<string, T>();
  for (const value of arr) map.set(canonicalValue(value), value);
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

function mergeStructured(path: string, local: unknown, remote: unknown): unknown {
  if (local === undefined || remote === undefined) return chooseAtomic(path, local, remote);

  if (Array.isArray(local) || Array.isArray(remote)) {
    if (!Array.isArray(local) || !Array.isArray(remote)) return chooseAtomic(path, local, remote);
    if (arraysUseIds(local, remote)) return unionById(local, remote, path);

    if (hasSyncClock(path)) return chooseAtomic(path, local, remote);

    // Pregnancy/postpartum daily list fields were historically union-like.
    // Preserve both legacy sides until the first new edit gives the field an LWW timestamp.
    if (path.startsWith("dayLogs/")) return dedupArray([...(remote as unknown[]), ...(local as unknown[])]);

    return chooseAtomic(path, local, remote);
  }

  if (isObj(local) || isObj(remote)) {
    if (!isObj(local) || !isObj(remote)) return chooseAtomic(path, local, remote);
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    const out: Record<string, unknown> = {};

    for (const key of keys) {
      const merged = mergeStructured(childPath(path, key), local[key], remote[key]);
      if (merged !== undefined) out[key] = merged;
    }
    return out;
  }

  return chooseAtomic(path, local, remote);
}

const ARRAY_FIELDS = [
  "pain",
  "tetany",
  "panic",
  "heat",
  "food",
  "bowel",
  "sex",
  "temperatureEntries",
  "weightEntries",
  "extraMeds",
  "workout",
  "mood",
  "energy",
  "histamine",
] as const;

const SCALAR_FIELDS = ["temperature", "weight", "sleepHours", "period", "periodInfo", "sleepQuality"] as const;

function mergeDayLog(local: DayLog | undefined, remote: DayLog | undefined, date: string): DayLog {
  const out: DayLog = {};
  const basePath = childPath("dayLogs", date);
  const allKeys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const handled = new Set<string>([...ARRAY_FIELDS, ...SCALAR_FIELDS, "pregnancy", "postpartum"]);

  for (const field of ARRAY_FIELDS) {
    const merged = unionById(
      local?.[field] as unknown,
      remote?.[field] as unknown,
      childPath(basePath, field),
    );
    if (merged.length || local?.[field] !== undefined || remote?.[field] !== undefined) {
      (out as Record<string, unknown>)[field] = merged;
    }
  }

  for (const field of SCALAR_FIELDS) {
    const merged = chooseAtomic(childPath(basePath, field), local?.[field], remote?.[field]);
    if (merged !== undefined) (out as Record<string, unknown>)[field] = merged;
  }

  const pregnancy = mergeStructured(childPath(basePath, "pregnancy"), local?.pregnancy, remote?.pregnancy);
  if (pregnancy !== undefined) out.pregnancy = pregnancy as DayLog["pregnancy"];

  const postpartum = mergeStructured(
    childPath(basePath, "postpartum"),
    normalizePostpartumDayLog(local?.postpartum),
    normalizePostpartumDayLog(remote?.postpartum),
  );
  if (postpartum !== undefined) out.postpartum = postpartum as PostpartumDayLog;

  for (const key of allKeys) {
    if (handled.has(key)) continue;
    const merged = mergeStructured(
      childPath(basePath, key),
      (local as Record<string, unknown> | undefined)?.[key],
      (remote as Record<string, unknown> | undefined)?.[key],
    );
    if (merged !== undefined) (out as Record<string, unknown>)[key] = merged;
  }

  return out;
}

function mergeDayLogs(
  local: Record<string, DayLog> | undefined,
  remote: Record<string, DayLog> | undefined,
): Record<string, DayLog> {
  const safeLocal = isObj(local) ? (local as Record<string, DayLog>) : {};
  const safeRemote = isObj(remote) ? (remote as Record<string, DayLog>) : {};
  const keys = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);
  const out: Record<string, DayLog> = {};

  for (const date of keys) {
    const localLog = isObj(safeLocal[date]) ? safeLocal[date] : undefined;
    const remoteLog = isObj(safeRemote[date]) ? safeRemote[date] : undefined;
    const dayPath = childPath("dayLogs", date);

    if (localLog === undefined || remoteLog === undefined) {
      const chosen = chooseAtomic(dayPath, localLog, remoteLog);
      if (chosen === undefined) continue;
    }

    const merged = mergeDayLog(localLog, remoteLog, date);
    if (Object.keys(merged).length) out[date] = merged;
  }

  return out;
}

/** dayNotes: legacy data unions; new edits are LWW at the date-array level. */
function mergeDayNotes(
  local: BixboData["dayNotes"] | undefined,
  remote: BixboData["dayNotes"] | undefined,
): BixboData["dayNotes"] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: BixboData["dayNotes"] = {};

  for (const date of keys) {
    const path = childPath("dayNotes", date);
    const l = local?.[date];
    const r = remote?.[date];

    if (hasSyncClock(path)) {
      const chosen = chooseAtomic(path, l, r);
      if (Array.isArray(chosen)) out[date] = chosen as BixboData["dayNotes"][string];
      continue;
    }

    const seen = new Set<string>();
    const merged: (string | { text: string; time?: string })[] = [];
    for (const item of [...(Array.isArray(l) ? l : []), ...(Array.isArray(r) ? r : [])]) {
      if (typeof item === "string") {
        const text = item.trim();
        const key = `string:${text}`;
        if (!text || seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
        continue;
      }
      if (!isObj(item) || typeof item.text !== "string") continue;
      const note = { text: item.text, time: typeof item.time === "string" ? item.time : undefined };
      const key = `note:${note.text}__${note.time ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(note);
    }
    out[date] = merged as BixboData["dayNotes"][string];
  }

  return out;
}

function mergeTodos(local: BixboData["todos"] | undefined, remote: BixboData["todos"] | undefined): BixboData["todos"] {
  const safeLocal = isObj(local) ? local : {};
  const safeRemote = isObj(remote) ? remote : {};
  const keys = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);
  const out: BixboData["todos"] = {};

  for (const date of keys) {
    out[date] = unionById(
      (safeLocal as BixboData["todos"])[date],
      (safeRemote as BixboData["todos"])[date],
      childPath("todos", date),
    );
  }

  return out;
}

/** medLog booleans use per-slot LWW, so true -> false (untake) is preserved. */
function mergeMedLog(
  local: BixboData["medLog"] | undefined,
  remote: BixboData["medLog"] | undefined,
): BixboData["medLog"] {
  const safeLocal = isObj(local) ? local : {};
  const safeRemote = isObj(remote) ? remote : {};
  const dates = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);
  const out: BixboData["medLog"] = {};

  for (const date of dates) {
    const lRaw = (safeLocal as BixboData["medLog"])[date];
    const rRaw = (safeRemote as BixboData["medLog"])[date];
    const l = isObj(lRaw) ? (lRaw as Record<string, boolean>) : {};
    const r = isObj(rRaw) ? (rRaw as Record<string, boolean>) : {};
    const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
    const inner: Record<string, boolean> = {};

    for (const key of keys) {
      const chosen = chooseAtomic(childPath(childPath("medLog", date), key), l[key], r[key]);
      if (typeof chosen === "boolean") inner[key] = chosen;
    }
    if (Object.keys(inner).length) out[date] = inner;
  }

  return out;
}

function mergeMedLogTimes(
  local: BixboData["medLogTimes"] | undefined,
  remote: BixboData["medLogTimes"] | undefined,
): BixboData["medLogTimes"] {
  const safeLocal = isObj(local) ? local : {};
  const safeRemote = isObj(remote) ? remote : {};
  const dates = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);
  const out: BixboData["medLogTimes"] = {};

  for (const date of dates) {
    const lRaw = (safeLocal as BixboData["medLogTimes"])[date];
    const rRaw = (safeRemote as BixboData["medLogTimes"])[date];
    const l = isObj(lRaw) ? (lRaw as Record<string, string>) : {};
    const r = isObj(rRaw) ? (rRaw as Record<string, string>) : {};
    const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
    const inner: Record<string, string> = {};

    for (const key of keys) {
      const chosen = chooseAtomic(childPath(childPath("medLogTimes", date), key), l[key], r[key]);
      if (typeof chosen === "string") inner[key] = chosen;
    }
    if (Object.keys(inner).length) out[date] = inner;
  }

  return out;
}

function mergeStringMap(local: unknown, remote: unknown, basePath: string): Record<string, string> {
  const l = isObj(local) ? local : {};
  const r = isObj(remote) ? remote : {};
  const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
  const out: Record<string, string> = {};

  for (const key of keys) {
    const chosen = chooseAtomic(childPath(basePath, key), l[key], r[key]);
    if (typeof chosen === "string") out[key] = chosen;
  }

  return out;
}

function mergeDeletedCustom(
  local: BixboData["deletedCustom"],
  remote: BixboData["deletedCustom"],
): Partial<Record<keyof CustomLists, string[]>> {
  const out: Partial<Record<keyof CustomLists, string[]>> = {};
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]) as Set<keyof CustomLists>;
  for (const key of keys) {
    const values = Array.from(new Set([...safeStringArray(local?.[key]), ...safeStringArray(remote?.[key])])).sort();
    if (values.length) out[key] = values;
  }
  return out;
}

function mergeCustom(
  local: CustomLists | undefined,
  remote: CustomLists | undefined,
  deleted: Partial<Record<keyof CustomLists, string[]>>,
): CustomLists {
  const merged = { ...(remote ?? {}), ...(local ?? {}) } as CustomLists;
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]) as Set<keyof CustomLists>;

  for (const key of keys) {
    const lv = local?.[key];
    const rv = remote?.[key];
    if (!Array.isArray(lv) && !Array.isArray(rv)) continue;
    const tombstones = new Set(deleted[key] ?? []);
    const union = dedupArray([...(rv ?? []), ...(lv ?? [])] as unknown[]) as unknown[];
    (merged as unknown as Record<string, unknown>)[key as string] = union.filter(
      (value) => !(typeof value === "string" && tombstones.has(value)),
    );
  }

  return merged;
}

function mergePregnancyState(local: unknown, remote: unknown): PregnancyState {
  const l = normalizePregnancyState(local);
  const r = normalizePregnancyState(remote);
  const merged = mergeStructured("pregnancy", l, r) as PregnancyState;
  const activePath = childPath("pregnancy", "active");

  // Legacy deactivation done before sync metadata existed: endedAt is the best
  // available proof that false was deliberate rather than a fresh-device default.
  if (!hasSyncClock(activePath) && l.active !== r.active) {
    if (!l.active && l.endedAt && !r.endedAt) merged.active = false;
    else if (!r.active && r.endedAt && !l.endedAt) merged.active = false;
  }

  return {
    ...EMPTY.pregnancy!,
    ...merged,
    hospitalBag: Array.isArray(merged.hospitalBag) ? merged.hospitalBag : [],
    vaccinations: Array.isArray(merged.vaccinations) ? merged.vaccinations : [],
    supplements: Array.isArray(merged.supplements) ? merged.supplements : [],
    appointments: Array.isArray(merged.appointments) ? merged.appointments : [],
  };
}

function mergePostpartumState(local: unknown, remote: unknown): PostpartumState {
  const l = normalizePostpartumState(local);
  const r = normalizePostpartumState(remote);
  const merged = mergeStructured("postpartum", l, r) as PostpartumState;
  const activePath = childPath("postpartum", "active");

  if (!hasSyncClock(activePath) && l.active !== r.active) {
    if (!l.active && l.endedAt && !r.endedAt) merged.active = false;
    else if (!r.active && r.endedAt && !l.endedAt) merged.active = false;
  }

  return {
    ...EMPTY.postpartum!,
    ...merged,
    visits: Array.isArray(merged.visits) ? merged.visits : [],
  };
}

export function mergeBixbo(local: BixboData, remote: BixboData | null | undefined): BixboData {
  if (!remote) return local;

  const localDeleted = Array.isArray(local.deletedIds)
    ? local.deletedIds.filter((id): id is string => typeof id === "string")
    : [];
  const remoteDeleted = Array.isArray(remote.deletedIds)
    ? remote.deletedIds.filter((id): id is string => typeof id === "string")
    : [];
  const legacyDeletedIds = Array.from(new Set([...localDeleted, ...remoteDeleted])).slice(-2000);
  const deletedCustom = mergeDeletedCustom(local.deletedCustom, remote.deletedCustom);
  const syncMeta = mergeSyncMeta(local.syncMeta, remote.syncMeta);

  _localMeta = normalizeMeta(local.syncMeta);
  _remoteMeta = normalizeMeta(remote.syncMeta);
  _legacyDeleted = new Set(legacyDeletedIds);
  _restoredLegacyIds = new Set();

  try {
    const result: BixboData = {
      ...remote,
      ...local,
      dayLogs: mergeDayLogs(local.dayLogs, remote.dayLogs),
      dayNotes: mergeDayNotes(local.dayNotes, remote.dayNotes),
      todos: mergeTodos(local.todos, remote.todos),
      tasks: unionById<TaskEntry>(local.tasks, remote.tasks, "tasks"),
      events: unionById<EventEntry>(local.events, remote.events, "events"),
      meds: unionById<Med>(local.meds, remote.meds, "meds"),
      medLog: mergeMedLog(local.medLog, remote.medLog),
      medLogTimes: mergeMedLogTimes(local.medLogTimes, remote.medLogTimes),
      medNames: mergeStringMap(local.medNames, remote.medNames, "medNames"),
      folders: unionById<NoteFolder>(local.folders, remote.folders, "folders"),
      notebook: unionById<Note>(local.notebook, remote.notebook, "notebook"),
      labs: unionById(local.labs, remote.labs, "labs"),
      docs: unionById(local.docs, remote.docs, "docs"),
      diagnoses: unionById(local.diagnoses, remote.diagnoses, "diagnoses"),
      deletedIds: legacyDeletedIds,
      deletedCustom,
      syncMeta,
      cycle: {
        ...EMPTY.cycle,
        ...(mergeStructured("cycle", local.cycle, remote.cycle) as BixboData["cycle"]),
      },
      custom: mergeCustom(local.custom, remote.custom, deletedCustom),
      settings: {
        ...EMPTY.settings,
        ...(mergeStructured("settings", local.settings, remote.settings) as BixboData["settings"]),
      },
      profile: mergeStructured("profile", local.profile, remote.profile) as BixboData["profile"],
      pregnancy: mergePregnancyState(local.pregnancy, remote.pregnancy),
      postpartum: mergePostpartumState(local.postpartum, remote.postpartum),
      // partner is a local-only projection of the other user's data — always keep local's.
      partner: local.partner ?? remote.partner,
    };

    if (_restoredLegacyIds.size) {
      result.deletedIds = legacyDeletedIds.filter((id) => !_restoredLegacyIds.has(id));
    }

    return result;
  } finally {
    _localMeta = { updatedAt: {}, deletedAt: {} };
    _remoteMeta = { updatedAt: {}, deletedAt: {} };
    _legacyDeleted = new Set();
    _restoredLegacyIds = new Set();
  }
}
