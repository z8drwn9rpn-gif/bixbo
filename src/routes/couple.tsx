import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, addDays, todayKey, painColor, PAIN_DESCRIPTIONS, type PainEntry } from "@/lib/storage";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Couple — BIXBO" },
      { name: "description", content: "Compare pain entries with your partner." },
      { property: "og:title", content: "Couple — BIXBO" },
      { property: "og:description", content: "Compare pain entries with your partner." },
    ],
  }),
  component: CouplePage,
});

function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No pain entries yet.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((p) => (
          <li key={`${p.dateKey}-${p.id}`} className="flex items-start gap-3 rounded-2xl bg-tint p-3">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: painColor(p.score) }}
            >
              {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{p.dateKey} · {p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}</p>
              {p.parts?.length ? <p className="text-sm">{p.parts.join(", ")}</p> : null}
              {p.quality?.length ? <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p> : null}
              {p.symptoms?.length ? <p className="text-xs text-muted-foreground">+ {p.symptoms.join(", ")}</p> : null}
              {p.mood?.length ? <p className="text-xs text-muted-foreground">Mood: {p.mood.join(", ")}</p> : null}
              {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
              {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
              {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;
  const days = 14;
  const end = todayKey();
  const start = addDays(end, -(days - 1));

  const collectPain = (dayLogs: Record<string, { pain?: PainEntry[] }>) => {
    const out: (PainEntry & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) {
      for (const p of l?.pain ?? []) out.push({ ...p, dateKey: k });
    }
    return out.sort((a, b) => (b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey))).slice(0, 30);
  };

  const myPain = collectPain(view.dayLogs);
  const partnerPain = partner ? collectPain(partner.dayLogs) : [];

  return (
    <AppShell title="Couple">
      <div className="space-y-4 px-5 pt-4 pb-24">
        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm">No partner linked yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">In Settings → Couple sharing, exchange pairing codes with your partner to see each other's pain log.</p>
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
              <PainList title={`${partner.name || "Partner"} — pain log`} entries={partnerPain} />
            </section>

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
              <PainList title="My pain log" entries={myPain} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
