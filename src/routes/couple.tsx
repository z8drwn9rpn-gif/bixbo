import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, addDays, todayKey, painColor } from "@/lib/storage";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Couple — BIXBO" },
      { name: "description", content: "Compare pain & panic entries with your partner." },
      { property: "og:title", content: "Couple — BIXBO" },
      { property: "og:description", content: "Compare pain & panic entries with your partner." },
    ],
  }),
  component: CouplePage,
});

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;
  const days = 14;
  const end = todayKey();
  const start = addDays(end, -(days - 1));

  return (
    <AppShell title="Couple">
      <div className="space-y-4 px-5 pt-4 pb-24">
        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm">No partner data yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Share your export in Settings → Couple sharing, and import your partner's JSON.</p>
            <Link to="/settings" className="mt-3 inline-block text-primary underline text-sm">Open Settings</Link>
          </div>
        ) : (
          <>
            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pain — last 14 days</p>
              <div className="mt-2 grid grid-cols-14 gap-1">
                {Array.from({ length: days }, (_, i) => {
                  const k = addDays(start, i);
                  const mine = view.dayLogs[k]?.pain?.reduce((s, p, _, a) => s + p.score / a.length, 0);
                  const theirs = partner.dayLogs[k]?.pain?.reduce((s, p, _, a) => s + p.score / a.length, 0);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-16 flex flex-col justify-end items-center gap-0.5">
                        {mine != null && <div className="w-3 rounded-t" style={{ height: `${mine * 7}px`, background: painColor(mine) }} />}
                        {theirs != null && <div className="w-3 rounded-t opacity-60" style={{ height: `${theirs * 7}px`, background: painColor(theirs), border: "1.5px dashed #000" }} />}
                      </div>
                      <span className="text-[8px] text-muted-foreground">{k.slice(-2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-primary" /> Me</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-dashed bg-primary opacity-60" /> {partner.name}</span>
              </div>
            </section>
            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Panic attacks — recent</p>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(partner.dayLogs)
                  .flatMap(([k, l]) => (l.panic ?? []).map((p) => ({ k, ...p })))
                  .slice(-10)
                  .map((p, i) => (
                    <li key={i}>{p.k} · {p.time} · intensity {p.intensity}/10 {p.trigger ? `— ${p.trigger}` : ""}</li>
                  ))}
                {Object.values(partner.dayLogs).every((l) => !l.panic?.length) && (
                  <li className="text-muted-foreground text-xs">No panic entries.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
