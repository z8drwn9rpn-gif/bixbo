import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, addDays, todayKey, painColor, PAIN_DESCRIPTIONS, type PainEntry, type PanicAttack, type TetanyEpisode, type ExtraMed, type Med } from "@/lib/storage";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Couple — BIXBO" },
      { name: "description", content: "Compare pain, tetany, panic and meds with your partner." },
      { property: "og:title", content: "Couple — BIXBO" },
      { property: "og:description", content: "Compare pain, tetany, panic and meds with your partner." },
    ],
  }),
  component: CouplePage,
});

function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">No pain entries yet.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((p) => (
          <li key={`${p.dateKey}-${p.id}`} className="flex items-start gap-3 rounded-2xl bg-tint p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: painColor(p.score) }}>
              {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{p.dateKey} · {p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}</p>
              {p.parts?.length ? <p className="text-sm">{p.parts.join(", ")}</p> : null}
              {p.quality?.length ? <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p> : null}
              {p.symptoms?.length ? <p className="text-xs text-muted-foreground">+ {p.symptoms.join(", ")}</p> : null}
              {p.hotFlashes != null ? <p className="text-xs text-muted-foreground">🥵 Hot flashes {p.hotFlashes}/5</p> : null}
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

function TetanyList({ title, entries }: { title: string; entries: (TetanyEpisode & { dateKey: string })[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((t) => (
          <li key={`${t.dateKey}-${t.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">{t.dateKey} · {t.time} · intensity {t.intensity}/5 · {t.minutes == null ? "ongoing" : `${t.minutes} min`}</p>
            {t.types?.length ? <p>{t.types.join(", ")}</p> : null}
            {t.location?.length ? <p className="text-xs text-muted-foreground">Location: {t.location.join(", ")}</p> : null}
            {t.triggers?.length ? <p className="text-xs text-muted-foreground">Triggers: {t.triggers.join(", ")}</p> : null}
            {t.helped?.length ? <p className="text-xs text-muted-foreground">Helped: {t.helped.join(", ")}</p> : null}
            {t.note && <p className="mt-1 whitespace-pre-line">"{t.note}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanicList({ title, entries }: { title: string; entries: (PanicAttack & { dateKey: string })[] }) {
  if (!entries.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((p) => (
          <li key={`${p.dateKey}-${p.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">{p.dateKey} · {p.time} · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}</p>
            {p.trigger && <p>Trigger: {p.trigger}</p>}
            {p.physical?.length ? <p className="text-xs text-muted-foreground">Physical: {p.physical.join(", ")}</p> : null}
            {p.cognitive?.length ? <p className="text-xs text-muted-foreground">Cognitive: {p.cognitive.join(", ")}</p> : null}
            {p.helped?.length ? <p className="text-xs text-muted-foreground">Helped: {p.helped.join(", ")}</p> : null}
            {p.note && <p className="mt-1 whitespace-pre-line">"{p.note}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedsList({ title, days }: {
  title: string;
  days: { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] }[];
}) {
  const nonEmpty = days.filter((d) => d.extra.length || d.meds.some((m) => !m.asNeeded && m.times.some((t) => d.medLog[`${m.id}@${t}`])));
  if (!nonEmpty.length) return <p className="text-xs text-muted-foreground">No meds logged yet.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {nonEmpty.slice(0, 14).map((d) => (
          <li key={d.dateKey} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">{d.dateKey}</p>
            {d.meds.map((m) => m.asNeeded ? null : m.times.filter((t) => d.medLog[`${m.id}@${t}`]).map((t) => (
              <p key={`${m.id}@${t}`}>✓ {t} — {m.name}{m.dose ? ` (${m.dose})` : ""}</p>
            )))}
            {d.extra.map((e) => (
              <p key={e.id}>• {e.time} — {e.name}{e.dose ? ` (${e.dose})` : ""}{e.note ? ` — ${e.note}` : ""}</p>
            ))}
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
    for (const [k, l] of Object.entries(dayLogs)) for (const p of l?.pain ?? []) out.push({ ...p, dateKey: k });
    return out.sort((a, b) => (b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey))).slice(0, 30);
  };
  const collectTetany = (dayLogs: Record<string, { tetany?: TetanyEpisode[] }>) => {
    const out: (TetanyEpisode & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) for (const t of l?.tetany ?? []) out.push({ ...t, dateKey: k });
    return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectPanic = (dayLogs: Record<string, { panic?: PanicAttack[] }>) => {
    const out: (PanicAttack & { dateKey: string })[] = [];
    for (const [k, l] of Object.entries(dayLogs)) for (const p of l?.panic ?? []) out.push({ ...p, dateKey: k });
    return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectMedDays = (meds: Med[], medLog: Record<string, Record<string, boolean>>, dayLogs: Record<string, { extraMeds?: ExtraMed[] }>) => {
    const keys = new Set<string>([...Object.keys(medLog ?? {}), ...Object.keys(dayLogs ?? {})]);
    return Array.from(keys).sort((a, b) => b.localeCompare(a)).map((k) => ({
      dateKey: k, meds, medLog: medLog[k] ?? {}, extra: dayLogs[k]?.extraMeds ?? [],
    }));
  };

  const myPain = collectPain(view.dayLogs);
  const myTetany = collectTetany(view.dayLogs);
  const myPanic = collectPanic(view.dayLogs);
  const myMeds = collectMedDays(view.meds, view.medLog, view.dayLogs);

  const partnerPain = partner ? collectPain(partner.dayLogs) : [];
  const partnerTetany = partner ? collectTetany(partner.dayLogs) : [];
  const partnerPanic = partner ? collectPanic(partner.dayLogs) : [];
  const partnerMeds = partner ? collectMedDays(partner.meds ?? [], partner.medLog ?? {}, partner.dayLogs) : [];

  return (
    <AppShell title="Couple">
      <div className="space-y-4 px-5 pt-4 pb-24">
        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm">No partner linked yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">In Settings → Couple sharing, exchange pairing codes with your partner to see each other's logs.</p>
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

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">🔥 {partner.name || "Partner"} — pain</h3>
              <PainList title="Recent" entries={partnerPain} />
            </section>

            {(partnerTetany.length > 0 || partnerPanic.length > 0) && (
              <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
                <h3 className="font-serif text-lg font-semibold">⚡ {partner.name || "Partner"} — episodes</h3>
                <TetanyList title="Tetany" entries={partnerTetany} />
                <PanicList title="Panic attacks" entries={partnerPanic} />
              </section>
            )}

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">💊 {partner.name || "Partner"} — meds</h3>
              <MedsList title="Recent days" days={partnerMeds} />
            </section>

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">🔥 My pain</h3>
              <PainList title="Recent" entries={myPain} />
            </section>

            {(myTetany.length > 0 || myPanic.length > 0) && (
              <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
                <h3 className="font-serif text-lg font-semibold">⚡ My episodes</h3>
                <TetanyList title="Tetany" entries={myTetany} />
                <PanicList title="Panic attacks" entries={myPanic} />
              </section>
            )}

            <section className="rounded-3xl bg-surface p-4 ring-1 ring-border space-y-3">
              <h3 className="font-serif text-lg font-semibold">💊 My meds</h3>
              <MedsList title="Recent days" days={myMeds} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
