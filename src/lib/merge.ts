/* BIXBO merge.ts — temporary bridge until exact pack upload completes.
 * Full pack version is reconstructed and SHA-verified locally.
 * SHA-256 pack: 2d323cb5ef02d3e726f2f1a27f4f1c5584ef6f87f1cece308c192ffbd401df66
 */
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
} from "./storage";

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function unionById<T extends { id: string }>(local: unknown, remote: unknown): T[] {
  const l = Array.isArray(local) ? (local as T[]).filter((x) => x && typeof x.id === "string") : [];
  const r = Array.isArray(remote) ? (remote as T[]).filter((x) => x && typeof x.id === "string") : [];
  const map = new Map<string, T>();
  for (const item of r) map.set(item.id, item);
  for (const item of l) map.set(item.id, item);
  return Array.from(map.values());
}

function mergeDayLogs(
  local: Record<string, DayLog> | undefined,
  remote: Record<string, DayLog> | undefined,
): Record<string, DayLog> {
  const out: Record<string, DayLog> = { ...(remote ?? {}) };
  for (const [date, log] of Object.entries(local ?? {})) {
    out[date] = { ...(out[date] ?? {}), ...log };
  }
  return out;
}

export interface MergeBixboOptions {
  legacyLocalCanonical?: boolean;
}

export function mergeBixbo(
  local: BixboData,
  remote: BixboData | null | undefined,
  _options: MergeBixboOptions = {},
): BixboData {
  if (!remote) return local;

  const localDeleted = Array.isArray(local.deletedIds) ? local.deletedIds : [];
  const remoteDeleted = Array.isArray(remote.deletedIds) ? remote.deletedIds : [];
  const deletedIds = Array.from(new Set([...localDeleted, ...remoteDeleted])).slice(-2000);

  return {
    ...remote,
    ...local,
    dayLogs: mergeDayLogs(local.dayLogs, remote.dayLogs),
    dayNotes: { ...(remote.dayNotes ?? {}), ...(local.dayNotes ?? {}) },
    todos: { ...(remote.todos ?? {}), ...(local.todos ?? {}) },
    tasks: unionById<TaskEntry>(local.tasks, remote.tasks),
    events: unionById<EventEntry>(local.events, remote.events),
    meds: unionById<Med>(local.meds, remote.meds),
    medLog: { ...(remote.medLog ?? {}), ...(local.medLog ?? {}) },
    medLogTimes: { ...(remote.medLogTimes ?? {}), ...(local.medLogTimes ?? {}) },
    medNames: { ...(remote.medNames ?? {}), ...(local.medNames ?? {}) },
    folders: unionById<NoteFolder>(local.folders, remote.folders),
    notebook: unionById<Note>(local.notebook, remote.notebook),
    labs: unionById(local.labs, remote.labs),
    docs: unionById(local.docs, remote.docs),
    diagnoses: unionById(local.diagnoses, remote.diagnoses),
    deletedIds,
    deletedCustom: { ...(remote.deletedCustom ?? {}), ...(local.deletedCustom ?? {}) },
    syncMeta: {
      updatedAt: { ...(remote.syncMeta?.updatedAt ?? {}), ...(local.syncMeta?.updatedAt ?? {}) },
      deletedAt: { ...(remote.syncMeta?.deletedAt ?? {}), ...(local.syncMeta?.deletedAt ?? {}) },
    },
    cycle: { ...EMPTY.cycle, ...(remote.cycle ?? {}), ...(local.cycle ?? {}) },
    custom: { ...EMPTY.custom, ...(remote.custom ?? {}), ...(local.custom ?? {}) } as CustomLists,
    settings: { ...EMPTY.settings, ...(remote.settings ?? {}), ...(local.settings ?? {}) },
    profile: { ...(remote.profile ?? {}), ...(local.profile ?? {}) },
    pregnancy: { ...EMPTY.pregnancy!, ...(remote.pregnancy ?? {}), ...(local.pregnancy ?? {}) },
    postpartum: { ...EMPTY.postpartum!, ...(remote.postpartum ?? {}), ...(local.postpartum ?? {}) },
    partner: local.partner ?? remote.partner,
  };
}
