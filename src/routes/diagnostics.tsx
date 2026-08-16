import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  clearRuntimeDiagnosticIssues,
  runAppDiagnostics,
  type AppDiagnosticReport,
  type DiagnosticResult,
  type DiagnosticStatus,
  type RuntimeDiagnosticIssue,
} from "@/lib/appDiagnostics";

type ForensicIssue = RuntimeDiagnosticIssue & {
  incidentId?: string;
  fingerprint?: string;
  occurrenceCount?: number;
  rootCause?: string;
  confidence?: number;
  traceId?: string;
  buildFingerprint?: string;
  timeline?: string[];
};

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "App diagnostics — BIXBO" },
      {
        name: "description",
        content: "Run forensic BIXBO checks for screens, storage, PWA assets, cloud, request traces, runtime failures, freezes, rendering and UI stutter.",
      },
    ],
  }),
  component: DiagnosticsPage,
});

const STATUS_LABEL: Record<DiagnosticStatus, string> = {
  ok: "OK",
  warning: "WARNING",
  error: "ERROR",
};

const INCIDENT_LABEL: Record<string, string> = {
  error: "JavaScript error",
  unhandledrejection: "Promise error",
  route: "Screen error",
  resource: "Resource failure",
  freeze: "Freeze",
  jank: "Frame / layout issue",
  longtask: "Long task / render",
  interaction: "Slow interaction",
  network: "Network / API",
  storage: "Storage pressure",
};

function statusClass(status: DiagnosticStatus): string {
  if (status === "error") return "bg-destructive/12 text-destructive ring-destructive/20";
  if (status === "warning") return "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300";
  return "bg-primary/12 text-primary ring-primary/20";
}

function resultBorder(status: DiagnosticStatus): string {
  if (status === "error") return "ring-destructive/30";
  if (status === "warning") return "ring-amber-500/25";
  return "ring-border/70";
}

function incidentIsError(issue: RuntimeDiagnosticIssue): boolean {
  if (issue.severity) return issue.severity === "error";
  return issue.kind === "error" || issue.kind === "unhandledrejection" || issue.kind === "route" || issue.kind === "resource";
}

function prettyCause(value?: string): string {
  if (!value) return "No dominant cause yet";
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResultRow({ item }: { item: DiagnosticResult }) {
  return (
    <article className={`rounded-2xl bg-surface px-4 py-3 shadow-sm ring-1 ${resultBorder(item.status)}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide ring-1 ${statusClass(item.status)}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
        </div>
      </div>
    </article>
  );
}

function DiagnosticsPage() {
  const router = useRouter();
  const [report, setReport] = useState<AppDiagnosticReport | null>(null);
  const [running, setRunning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setScanError(null);
    try {
      const next = await runAppDiagnostics({
        preloadRoute: async (path) => {
          await router.preloadRoute({ to: path as never });
        },
      });
      setReport(next);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "The scanner could not finish.");
    } finally {
      setRunning(false);
    }
  }, [router, running]);

  useEffect(() => {
    void run();
    // The first scan is intentional; subsequent scans are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const values = { ok: 0, warning: 0, error: 0 };
    report?.results.forEach((item) => {
      values[item.status] += 1;
    });
    return values;
  }, [report]);

  const groups = useMemo(() => {
    const map = new Map<string, DiagnosticResult[]>();
    report?.results.forEach((item) => {
      const list = map.get(item.area) ?? [];
      list.push(item);
      map.set(item.area, list);
    });
    return [...map.entries()];
  }, [report]);

  const forensicSummary = useMemo(() => {
    const issues = (report?.runtimeIssues ?? []) as ForensicIssue[];
    const clusters = new Set(issues.map((issue) => issue.incidentId ?? issue.id)).size;
    const causeCounts = new Map<string, number>();
    const fingerprintCounts = new Map<string, number>();

    for (const issue of issues) {
      const weight = Math.max(1, issue.occurrenceCount ?? 1);
      if (issue.rootCause) causeCounts.set(issue.rootCause, (causeCounts.get(issue.rootCause) ?? 0) + weight);
      if (issue.fingerprint) fingerprintCounts.set(issue.fingerprint, (fingerprintCounts.get(issue.fingerprint) ?? 0) + weight);
    }

    const topCause = [...causeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mostRepeated = [...fingerprintCounts.values()].sort((a, b) => b - a)[0] ?? 0;
    return { clusters, topCause, mostRepeated };
  }, [report]);

  const clearHistory = () => {
    clearRuntimeDiagnosticIssues();
    void run();
  };

  return (
    <AppShell title="App diagnostics">
      <div className="space-y-4 px-4 pb-28 pt-4 sm:px-5 lg:px-0 lg:pb-12">
        <Link to="/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
          ← Back to Health
        </Link>

        <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-foreground">BIXBO App Scanner</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Forensic correlation engine for screens, data, storage, PWA deployment, cloud, request traces and device performance. It connects freezes, screen jumps, expensive React renders, slow assets/API calls, reload storms and crashes into incident clusters instead of treating every warning as an isolated event.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={running}
              className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {running ? "Scanning…" : "Run scan"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-primary/10 p-3 text-center ring-1 ring-primary/15">
              <p className="text-2xl font-black tabular-nums text-primary">{counts.ok}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">OK</p>
            </div>
            <div className="rounded-2xl bg-amber-500/10 p-3 text-center ring-1 ring-amber-500/15">
              <p className="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-300">{counts.warning}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Warnings</p>
            </div>
            <div className="rounded-2xl bg-destructive/10 p-3 text-center ring-1 ring-destructive/15">
              <p className="text-2xl font-black tabular-nums text-destructive">{counts.error}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Errors</p>
            </div>
          </div>

          {report && (
            <p className="mt-3 text-xs text-muted-foreground">
              Last scan: {new Date(report.finishedAt).toLocaleString()} · {(report.finishedAt - report.startedAt) / 1000}s
            </p>
          )}
          {scanError && <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">Scanner error: {scanError}</p>}
        </section>

        <section className="rounded-3xl bg-tint p-4 text-xs leading-relaxed text-muted-foreground ring-1 ring-border/60">
          <span className="font-bold text-foreground">Black-box recorder:</span> keeps a rolling technical timeline, correlates request trace IDs, server timing, route transitions, component render cost, frame/layout jumps, startup stalls, deployment/cache identity, service-worker state, storage pressure, memory pressure where supported, API failures and abrupt session endings. Repeated signatures are fingerprinted and counted. Health-log contents, form values and request bodies are never copied into diagnostics.
        </section>

        {report?.runtimeIssues.length ? (
          <section className="grid grid-cols-3 gap-2 rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-xl font-black tabular-nums text-foreground">{forensicSummary.clusters}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Incident clusters</p>
            </div>
            <div className="rounded-2xl bg-tint p-3">
              <p className="line-clamp-2 text-xs font-black text-foreground">{prettyCause(forensicSummary.topCause)}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Top root cause</p>
            </div>
            <div className="rounded-2xl bg-tint p-3">
              <p className="text-xl font-black tabular-nums text-foreground">{forensicSummary.mostRepeated || 1}×</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Top fingerprint</p>
            </div>
          </section>
        ) : null}

        {running && !report ? (
          <section className="rounded-3xl bg-surface p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-border/80">
            Running full app scan…
          </section>
        ) : null}

        {groups.map(([area, items]) => (
          <section key={area} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{area}</h2>
              <span className="text-[10px] font-semibold text-muted-foreground">{items.length} checks</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => <ResultRow key={item.id} item={item} />)}
            </div>
          </section>
        ))}

        {report?.runtimeIssues.length ? (
          <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Recorded app incidents</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Local forensic evidence only; health-log contents are not stored here.</p>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                className="min-h-11 rounded-full border border-border px-3 text-xs font-bold text-foreground"
              >
                Clear resolved
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {report.runtimeIssues.map((rawIssue) => {
                const issue = rawIssue as ForensicIssue;
                const isError = incidentIsError(issue);
                return (
                  <div
                    key={issue.id}
                    className={`rounded-2xl p-3 ring-1 ${isError ? "bg-destructive/5 ring-destructive/15" : "bg-amber-500/5 ring-amber-500/20"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-black ${isError ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>{issue.area}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ring-1 ${isError ? "bg-destructive/10 text-destructive ring-destructive/15" : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"}`}>
                        {INCIDENT_LABEL[issue.kind] ?? issue.kind}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{new Date(issue.at).toLocaleString()}</span>
                      {(issue.occurrenceCount ?? 1) > 1 ? <span className="rounded-full bg-background px-2 py-0.5 text-[9px] font-black text-foreground ring-1 ring-border">Seen {issue.occurrenceCount}×</span> : null}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <p className="break-words text-xs text-foreground">
                        <span className="font-black">What happened: </span>{issue.message}
                      </p>
                      {issue.rootCause ? (
                        <p className="rounded-xl bg-background/70 p-2 text-[11px] font-semibold text-foreground ring-1 ring-border/70">
                          <span className="font-black">Primary root cause: </span>{prettyCause(issue.rootCause)}
                          {typeof issue.confidence === "number" ? ` · ${Math.round(issue.confidence)}% confidence` : ""}
                        </p>
                      ) : null}
                      {typeof issue.durationMs === "number" ? (
                        <p className="text-[10px] font-semibold tabular-nums text-muted-foreground">Measured delay: {issue.durationMs} ms</p>
                      ) : null}
                      <p className="break-all text-[10px] text-muted-foreground">
                        <span className="font-black text-foreground">Where: </span>{issue.path}
                      </p>
                      {(issue.incidentId || issue.fingerprint) ? (
                        <p className="break-all text-[10px] text-muted-foreground">
                          <span className="font-black text-foreground">Correlation: </span>
                          {issue.incidentId ? `cluster ${issue.incidentId}` : ""}{issue.incidentId && issue.fingerprint ? " · " : ""}{issue.fingerprint ? `fingerprint ${issue.fingerprint}` : ""}
                        </p>
                      ) : null}
                      {(issue.traceId || issue.buildFingerprint) ? (
                        <p className="break-all text-[10px] text-muted-foreground">
                          <span className="font-black text-foreground">Trace / build: </span>
                          {issue.traceId ? issue.traceId : "no request trace"}{issue.buildFingerprint ? ` · ${issue.buildFingerprint}` : ""}
                        </p>
                      ) : null}
                      {issue.timeline?.length ? (
                        <div className="rounded-xl bg-background/55 p-2 text-[10px] leading-relaxed text-muted-foreground ring-1 ring-border/60">
                          <p className="font-black text-foreground">60-second black-box timeline</p>
                          <ol className="mt-1 space-y-0.5">
                            {issue.timeline.map((event, index) => <li key={`${issue.id}-timeline-${index}`} className="break-words">{event}</li>)}
                          </ol>
                        </div>
                      ) : null}
                      {issue.context ? (
                        <p className="break-words rounded-xl bg-background/55 p-2 text-[10px] leading-relaxed text-muted-foreground ring-1 ring-border/60">
                          <span className="font-black text-foreground">Why / forensic evidence: </span>{issue.context}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl bg-tint p-4 text-xs leading-relaxed text-muted-foreground ring-1 ring-border/60">
          The scanner now correlates multiple signals into incident clusters, fingerprints recurring failures and assigns a confidence score to the leading technical cause. Browser/PWA telemetry still cannot prove every OS-level termination, especially when iOS kills a process without exposing a reason, so CI browser tests remain the second independent layer.
        </section>
      </div>
    </AppShell>
  );
}