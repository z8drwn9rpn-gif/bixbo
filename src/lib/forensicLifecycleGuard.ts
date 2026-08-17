const ISSUE_KEY = "bixbo:runtime-diagnostics:v1";
const SESSION_KEY = "bixbo:flight-session:v1";
const LEGACY_BOOT_HISTORY_KEY = "bixbo:flight-boots:v1";
const LIFECYCLE_GUARD_KEY = "bixbo:flight-lifecycle-guard:v2";
const BOOT_RETENTION_MS = 10 * 60_000;
const RELOAD_LOOP_WINDOW_MS = 60_000;
const RELOAD_LOOP_THRESHOLD = 5;
const RELOAD_ALERT_COOLDOWN_MS = 60_000;
const FAST_LIFECYCLE_ABORT_MS = 1_500;

type StoredIssue = {
  at?: unknown;
  kind?: unknown;
  message?: unknown;
  durationMs?: unknown;
  context?: unknown;
  timeline?: unknown;
  occurrenceCount?: unknown;
  [key: string]: unknown;
};

type SessionMarker = {
  id?: unknown;
  active?: unknown;
  lastSeen?: unknown;
  path?: unknown;
};

type LifecycleGuardState = {
  installedAt: number;
  boots: number[];
  lastAlertAt: number;
};

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Forensic hardening is best-effort in restricted storage contexts.
  }
}

function isIosStandalonePwa(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean; maxTouchPoints?: number };
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
  const standalone = nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
  return ios && standalone;
}

function issueEvidence(issue: StoredIssue): string {
  const timeline = Array.isArray(issue.timeline) ? issue.timeline.join(" ") : "";
  return `${String(issue.context ?? "")} ${timeline}`;
}

function isFastLifecycleFetchAbort(issue: StoredIssue): boolean {
  const message = String(issue.message ?? "");
  if (!/failed:.*(?:TypeError: Load failed|Failed to fetch|NetworkError|network connection was lost)/i.test(message)) return false;
  const duration = typeof issue.durationMs === "number" ? issue.durationMs : Number.POSITIVE_INFINITY;
  if (duration > FAST_LIFECYCLE_ABORT_MS) return false;
  const evidence = issueEvidence(issue);
  return /visibility(?:=| · )hidden|pagehide · (?:leaving|bfcache)/i.test(evidence);
}

function isUnreliableIosAbruptSessionSignal(issue: StoredIssue): boolean {
  const message = String(issue.message ?? "");
  if (!/^Previous app session .* ended without a clean pagehide signal\.$/i.test(message)) return false;
  return /display=standalone-PWA/i.test(issueEvidence(issue));
}

function isLegacyReloadLoopIssue(issue: StoredIssue, installedAt: number): boolean {
  const at = typeof issue.at === "number" ? issue.at : 0;
  const message = String(issue.message ?? "");
  return at < installedAt && /BIXBO launches\/reloads were detected within 60 seconds\./i.test(message);
}

function sanitizeStoredForensicIssues(installedAt: number): void {
  const parsed = readLocalJson<unknown>(ISSUE_KEY, []);
  if (!Array.isArray(parsed)) return;

  let changed = false;
  const next = parsed.filter((raw) => {
    if (!raw || typeof raw !== "object") return true;
    const issue = raw as StoredIssue;
    const remove =
      isFastLifecycleFetchAbort(issue) ||
      isUnreliableIosAbruptSessionSignal(issue) ||
      isLegacyReloadLoopIssue(issue, installedAt);
    if (remove) changed = true;
    return !remove;
  });

  if (changed) writeLocalJson(ISSUE_KEY, next);
}

function readGuardState(now: number): LifecycleGuardState {
  const fallback: LifecycleGuardState = { installedAt: now, boots: [], lastAlertAt: 0 };
  const parsed = readLocalJson<unknown>(LIFECYCLE_GUARD_KEY, fallback);
  if (!parsed || typeof parsed !== "object") return fallback;
  const row = parsed as Partial<LifecycleGuardState>;
  return {
    installedAt: typeof row.installedAt === "number" ? row.installedAt : now,
    boots: Array.isArray(row.boots)
      ? row.boots.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      : [],
    lastAlertAt: typeof row.lastAlertAt === "number" ? row.lastAlertAt : 0,
  };
}

/**
 * appFlightRecorder v3 reports a reload loop after only three starts and caps
 * its history at 12. Feed it a guarded history so the existing deep recorder
 * remains intact while only genuine 5+ starts/minute become an incident, at
 * most once per minute.
 */
function prepareReloadLoopHistory(state: LifecycleGuardState, now: number): LifecycleGuardState {
  const retained = state.boots.filter((value) => now - value < BOOT_RETENTION_MS);
  const boots = [...retained, now].slice(-64);
  const lastMinute = boots.filter((value) => now - value < RELOAD_LOOP_WINDOW_MS);
  const mayAlert = lastMinute.length >= RELOAD_LOOP_THRESHOLD && now - state.lastAlertAt >= RELOAD_ALERT_COOLDOWN_MS;

  if (mayAlert) {
    // v3 appends the current boot itself, so expose only the preceding boots.
    writeLocalJson(LEGACY_BOOT_HISTORY_KEY, lastMinute.slice(0, -1).slice(-11));
  } else {
    // Prevent v3's old >=3 threshold from manufacturing an incident.
    writeLocalJson(LEGACY_BOOT_HISTORY_KEY, []);
  }

  const next = {
    installedAt: state.installedAt,
    boots,
    lastAlertAt: mayAlert ? now : state.lastAlertAt,
  };
  writeLocalJson(LIFECYCLE_GUARD_KEY, next);
  return next;
}

/**
 * iOS can discard a standalone WebKit process without firing pagehide. That is
 * a normal browser lifecycle outcome and is not reliable evidence of a
 * JavaScript crash, so do not let v3 turn that marker into a red runtime error.
 */
function neutralizeIosAbruptSessionMarker(): void {
  if (!isIosStandalonePwa()) return;
  const marker = readLocalJson<SessionMarker | null>(SESSION_KEY, null);
  if (!marker || marker.active !== true) return;
  writeLocalJson(SESSION_KEY, { ...marker, active: false, lastSeen: Date.now() });
}

export function installForensicLifecycleGuard(): void {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof navigator === "undefined") return;

  const now = Date.now();
  const state = readGuardState(now);
  sanitizeStoredForensicIssues(state.installedAt);
  neutralizeIosAbruptSessionMarker();
  prepareReloadLoopHistory(state, now);

  const sanitizeWhenVisible = () => {
    if (document.visibilityState === "visible") sanitizeStoredForensicIssues(state.installedAt);
  };
  window.addEventListener("pageshow", () => sanitizeStoredForensicIssues(state.installedAt));
  window.addEventListener("focus", sanitizeWhenVisible);
  document.addEventListener("visibilitychange", sanitizeWhenVisible);
}
