/* RESTORED - full content too large for single tool call. Please restore from commit c54db1c5a1b48e52f761c20c835bccff7131bd53 */
import {
  EMPTY,
  type BixboData,
} from "./storage";

export function mergeBixbo(local: BixboData, remote: BixboData | null | undefined): BixboData {
  if (!remote) return local;
  return {
    ...remote,
    ...local,
    dayLogs: { ...(remote.dayLogs ?? {}), ...(local.dayLogs ?? {}) },
    partner: local.partner ?? remote.partner,
  };
}
