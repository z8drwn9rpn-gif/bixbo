import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  clearRuntimeDiagnosticIssues,
  runAppDiagnostics,
  type AppDiagnosticReport,
  type DiagnosticResult,
  type DiagnosticStatus,
} from "@/lib/appDiagnostics";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "App diagnostics — BIXBO" },
      {
        name: "description",
        content: "Run local BIXBO checks for screens, storage, PWA assets, notifications, cloud access and runtime errors.",
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
                Checks app screens, local data, browser storage, PWA files, push support, cloud session and recent uncaught errors.
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
                <h2 className="text-sm font-bold text-foreground">Recorded app errors</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Stored only on this device; health-log contents are not stored here.</p>
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
              {report.runtimeIssues.map((issue) => (
                <div key={issue.id} className="rounded-2xl bg-destructive/5 p-3 ring-1 ring-destructive/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-destructive">{issue.area}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(issue.at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 break-words text-xs text-foreground">{issue.message}</p>
                  <p className="mt-1 break-all text-[10px] text-muted-foreground">{issue.path}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl bg-tint p-4 text-xs leading-relaxed text-muted-foreground ring-1 ring-border/60">
          The scanner catches many technical failures, but it cannot mathematically prove that every interaction is correct. BIXBO's CI browser tests remain the second layer for full user-flow testing after code changes.
        </section>
      </div>
    </AppShell>
  );
}
