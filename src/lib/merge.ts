/* ------------------------------------------------------------------
 * Deep merge for BixboData used by cloud sync.
 * Goal: never silently drop data from either side. Union arrays by id,
 * prefer local on scalar conflicts (local is "in progress" / freshest
 * from the user's own device), and prefer whichever side actually has
 * a value when the other side is missing it.
 * ------------------------------------------------------------------ */
import type {
  BixboData, DayLog, NoteFolder, Note, TaskEntry, EventEntry, Med, CustomLists,
} from "./storage";

type WithId = { id: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Rough "completeness" score used to pick the better of two same-id entries. */
function completeness(v: unknown): number {
  if (v == null) return 0;
  if (typeof v !== "object") return 1;
  let n = 0;
  for (const val of Object.values(v as Record<string, unknown>)) {
    if (val == null || val === "" ) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    n++;
  }
  return n;
}

/** Union two arrays of id-keyed entries. On id collision, keep the more
 * complete one, preferring local when tied. */
function unionById<T extends WithId>(local: T[] | undefined, remote: T[] | undefined): T[] | undefined {
  if (!local?.length) return remote?.length ? remote.slice() : local;
  if (!remote?.length) return local;
  const out = new Map<string, T>();
  for (const r of remote) out.set(r.id, r);
  for (const l of local) {
    const existing = out.get(l.id);
    if (!existing) { out.set(l.id, l); continue; }
    out.set(l.id, completeness(l) >= completeness(existing) ? l : existing);
  }
  return Array.from(out.values());
}

const ARRAY_FIELDS = [
  "pain", "tetany", "panic", "heat", "food", "bowel", "sex",
  "extraMeds", "workout", "mood", "energy", "histamine",
] as const;

const SCALAR_FIELDS = [
  "temperature", "weight", "sleepHours", "period", "periodInfo", "sleepQuality",
] as const;

function mergeDayLog(local: DayLog | undefined, remote: DayLog | undefined): DayLog {
  const out: DayLog = {};
  for (const f of ARRAY_FIELDS) {
    const merged = unionById(local?.[f] as WithId[] | undefined, remote?.[f] as WithId[] | undefined);
    if (merged !== undefined) (out as Record<string, unknown>)[f] = merged;
  }
  for (const f of SCALAR_FIELDS) {
    const lv = local?.[f];
    const rv = remote?.[f];
    (out as Record<string, unknown>)[f] = lv !== undefined && lv !== null && lv !== "" ? lv : rv;
  }
  return out;
}

function mergeDayLogs(local: Record<string, DayLog> | undefined, remote: Record<string, DayLog> | undefined): Record<string, DayLog> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: Record<string, DayLog> = {};
  for (const k of keys) out[k] = mergeDayLog(local?.[k], remote?.[k]);
  return out;
}

/** dayNotes: values are arrays of notes (string or object), union by identity/text+time. */
function mergeDayNotes(
  local: BixboData["dayNotes"] | undefined,
  remote: BixboData["dayNotes"] | undefined,
): BixboData["dayNotes"] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: BixboData["dayNotes"] = {};
  for (const k of keys) {
    const l = local?.[k] ?? [];
    const r = remote?.[k] ?? [];
    const seen = new Set<string>();
    const merged: (string | { text: string; time?: string })[] = [];
    for (const n of [...l, ...r]) {
      const key = typeof n === "string" ? n : `${n.text}__${n.time ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n as never);
    }
    out[k] = merged as never;
  }
  return out;
}

/** todos: Record<dateKey, Todo[]> union by id */
function mergeTodos(local: BixboData["todos"] | undefined, remote: BixboData["todos"] | undefined): BixboData["todos"] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: BixboData["todos"] = {};
  for (const k of keys) out[k] = unionById(local?.[k], remote?.[k]) ?? [];
  return out;
}

/** medLog: Record<dateKey, Record<medKey, boolean>> — OR booleans together. */
function mergeMedLog(local: BixboData["medLog"] | undefined, remote: BixboData["medLog"] | undefined): BixboData["medLog"] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: BixboData["medLog"] = {};
  for (const k of keys) {
    const l = local?.[k] ?? {};
    const r = remote?.[k] ?? {};
    const innerKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
    const inner: Record<string, boolean> = {};
    for (const ik of innerKeys) inner[ik] = !!l[ik] || !!r[ik];
    out[k] = inner;
  }
  return out;
}

/** medLogTimes: Record<dateKey, Record<key, string>> — prefer local string when present. */
function mergeMedLogTimes(local: BixboData["medLogTimes"] | undefined, remote: BixboData["medLogTimes"] | undefined): BixboData["medLogTimes"] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: BixboData["medLogTimes"] = {};
  for (const k of keys) {
    const l = local?.[k] ?? {};
    const r = remote?.[k] ?? {};
    const innerKeys = new Set([...Object.keys(l), ...Object.keys(r)]);
    const inner: Record<string, string> = {};
    for (const ik of innerKeys) inner[ik] = l[ik] || r[ik];
    out[k] = inner;
  }
  return out;
}

/** medNames: Record<key, string> — prefer local. */
function mergeStringMap(local: Record<string, string> | undefined, remote: Record<string, string> | undefined): Record<string, string> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = local?.[k] || remote?.[k] || "";
  return out;
}

function dedupArray<T>(arr: T[] | undefined): T[] {
  if (!arr?.length) return arr ?? [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const v of arr) {
    const key = typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function mergeCustom(local: CustomLists | undefined, remote: CustomLists | undefined): CustomLists {
  const merged = { ...(remote ?? {}), ...(local ?? {}) } as CustomLists;
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]) as Set<keyof CustomLists>;
  for (const k of keys) {
    const lv = local?.[k];
    const rv = remote?.[k];
    if (Array.isArray(lv) || Array.isArray(rv)) {
      (merged as Record<string, unknown>)[k as string] = dedupArray([...(rv ?? []), ...(lv ?? [])] as unknown[]);
    }
  }
  return merged;
}

export function mergeBixbo(local: BixboData, remote: BixboData | null | undefined): BixboData {
  if (!remote) return local;
  return {
    ...remote,
    ...local,
    dayLogs: mergeDayLogs(local.dayLogs, remote.dayLogs),
    dayNotes: mergeDayNotes(local.dayNotes, remote.dayNotes),
    todos: mergeTodos(local.todos, remote.todos),
    tasks: unionById<TaskEntry>(local.tasks, remote.tasks) ?? [],
    events: unionById<EventEntry>(local.events, remote.events) ?? [],
    meds: unionById<Med>(local.meds, remote.meds) ?? [],
    medLog: mergeMedLog(local.medLog, remote.medLog),
    medLogTimes: mergeMedLogTimes(local.medLogTimes, remote.medLogTimes),
    medNames: mergeStringMap(local.medNames, remote.medNames),
    folders: unionById<NoteFolder>(local.folders, remote.folders) ?? [],
    notebook: unionById<Note>(local.notebook, remote.notebook) ?? [],
    cycle: { ...(remote.cycle ?? {}), ...(local.cycle ?? {}) },
    custom: mergeCustom(local.custom, remote.custom),
    settings: { ...(remote.settings ?? {}), ...(local.settings ?? {}) },
    // partner is a local-only projection of the other user's data — always keep local's.
    partner: local.partner ?? remote.partner,
  };
}
