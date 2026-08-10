import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { Ico } from "@/components/icons/BixboIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBixbo, EMPTY, todayKey, fromKey, updateDayLog, type BixboData, type PregnancyAppointment } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";
import {
  pregnancyProgress,
  dueDateOf,
  babySize,
  DEFAULT_HOSPITAL_BAG,
  DEFAULT_PREGNANCY_VACCINES,
  DEFAULT_SUPPLEMENTS,
  PREGNANCY_SYMPTOMS,
} from "@/lib/health";
import {
  Section,
  Field,
  Slider0to10,
  Chip,
  TagList,
  SimpleLineChart,
  Checklist,
  BloodPressureForm,
  BloodSugarForm,
  KickCounter,
  ContractionTimer,
  AppointmentForm,
  AppointmentList,
  exportTimeline,
  downloadTextFile,
} from "@/components/PregnancyPanels";

export const Route = createFileRoute("/pregnancy")({
  head: () => ({
    meta: [
      { title: "Health of Bixbo — Pregnancy" },
      { name: "description", content: "Pregnancy week tracker, kicks, contractions, appointments and symptoms." },
      { property: "og:title", content: "Health of Bixbo — Pregnancy" },
      { property: "og:description", content: "Pregnancy dashboard for BIXBO." },
    ],
  }),
  component: PregnancyPage,
});

const MOOD_CHIPS = ["Happy", "Anxious", "Emotional", "Calm", "Irritable", "Excited", "Tired", "Overwhelmed"];

function PregnancyPage() {
  const { t } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const p = view.pregnancy ?? EMPTY.pregnancy!;
  const today = todayKey();
  const todayLog = view.dayLogs[today]?.pregnancy;

  const progress = pregnancyProgress(p, today);

  const resetPregnancy = () => {
    const confirmed = window.confirm(
      t("This will permanently delete all pregnancy tracking data — due date, weight log, blood pressure, blood sugar, kicks, contractions, appointments, checklists, symptoms and daily pregnancy logs. This cannot be undone."),
    );

    if (!confirmed) return;

    update((d) => {
      const dayLogs = Object.fromEntries(
        Object.entries(d.dayLogs).map(([date, dayLog]) => {
          const nextLog = { ...dayLog };
          delete nextLog.pregnancy;
          return [date, nextLog];
        }),
      ) as BixboData["dayLogs"];

      return {
        ...d,
        pregnancy: {
          active: false,
          hospitalBag: [],
          vaccinations: [],
          supplements: [],
          appointments: [],
        },
        settings: {
          ...d.settings,
          pregnantSince: undefined,
        },
        profile: {
          ...(d.profile ?? {}),
          pregnancyStatus: d.profile?.pregnancyStatus === "pregnant" ? "none" : d.profile?.pregnancyStatus,
        },
        dayLogs,
      };
    });
  };

  if (!p.active || (!p.lmp && !p.dueDate)) {
    return (
      <AppShell title={t("Pregnancy")}>
        <div className="px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <SetupForm view={view} update={update} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("Pregnancy")}>
      <div className="space-y-4 px-5 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <HeroSection view={view} update={update} progress={progress} />

        {progress && <BabySizeCard week={progress.week} />}

        <WeightSection view={view} update={update} />

        <Section title="Blood pressure" icon="🩺">
          <BloodPressureForm
            onAdd={(e) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: { ...(log.pregnancy ?? {}), bloodPressure: [...(log.pregnancy?.bloodPressure ?? []), e] },
              }))
            }
          />
          <RecentBP view={view} update={update} />
        </Section>

        <Section title="Blood sugar" icon="🍬">
          <BloodSugarForm
            onAdd={(e) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: { ...(log.pregnancy ?? {}), bloodSugar: [...(log.pregnancy?.bloodSugar ?? []), e] },
              }))
            }
          />
          <RecentBS view={view} update={update} />
        </Section>

        <Section title="Baby movement" icon="👣">
          <KickCounter
            sessions={todayLog?.kicks ?? []}
            onSave={(s) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: { ...(log.pregnancy ?? {}), kicks: [...(log.pregnancy?.kicks ?? []), s] },
              }))
            }
            onDelete={(id) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: { ...(log.pregnancy ?? {}), kicks: (log.pregnancy?.kicks ?? []).filter((k) => k.id !== id) },
              }))
            }
          />
        </Section>

        <Section title="Contractions" icon="⏱️">
          <ContractionTimer
            contractions={todayLog?.contractions ?? []}
            onAdd={(c) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: { ...(log.pregnancy ?? {}), contractions: [...(log.pregnancy?.contractions ?? []), c] },
              }))
            }
            onDelete={(id) =>
              updateDayLog(update, today, (log) => ({
                ...log,
                pregnancy: {
                  ...(log.pregnancy ?? {}),
                  contractions: (log.pregnancy?.contractions ?? []).filter((c) => c.id !== id),
                },
              }))
            }
          />
        </Section>

        <AppointmentsSection view={view} update={update} />

        <Section title="Hospital bag" icon="🎒">
          <Checklist
            items={p.hospitalBag}
            defaults={DEFAULT_HOSPITAL_BAG}
            onChange={(items) =>
              update((d) => ({ ...d, pregnancy: { ...(d.pregnancy ?? EMPTY.pregnancy!), hospitalBag: items } }))
            }
          />
        </Section>

        <Section title="Vaccinations" icon="💉">
          <Checklist
            items={p.vaccinations}
            defaults={DEFAULT_PREGNANCY_VACCINES}
            onChange={(items) =>
              update((d) => ({ ...d, pregnancy: { ...(d.pregnancy ?? EMPTY.pregnancy!), vaccinations: items } }))
            }
          />
        </Section>

        <Section title="Supplements" icon="💊">
          <Checklist
            items={p.supplements}
            defaults={DEFAULT_SUPPLEMENTS}
            onChange={(items) =>
              update((d) => ({ ...d, pregnancy: { ...(d.pregnancy ?? EMPTY.pregnancy!), supplements: items } }))
            }
          />
        </Section>

        <SymptomsSection view={view} update={update} />

        <PhotosSection view={view} update={update} />

        <Section title="Export" icon="📄">
          <p className="mb-2 text-xs text-muted-foreground">{t("Download a plain-text timeline of your pregnancy.")}</p>
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => downloadTextFile(`pregnancy-timeline-${today}.txt`, exportTimeline(view))}
          >
            {t("Export timeline (.txt)")}
          </Button>
        </Section>

        <Section title="Reset" icon="⚠️">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {t("Permanently delete all pregnancy setup details and daily pregnancy logs. Other BIXBO data will remain unchanged.")}
          </p>
          <Button type="button" variant="destructive" className="h-11 w-full" onClick={resetPregnancy}>
            {t("Delete all pregnancy data")}
          </Button>
        </Section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function SetupForm({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const { t } = useI18n();
  const [lmp, setLmp] = useState(view.pregnancy?.lmp ?? "");
  const [dueDate, setDueDate] = useState(view.pregnancy?.dueDate ?? "");
  const [startWeight, setStartWeight] = useState(view.pregnancy?.startWeightKg != null ? String(view.pregnancy.startWeightKg) : "");
  const [multiples, setMultiples] = useState(String(view.pregnancy?.multiples ?? 1));

  const submit = () => {
    if (!lmp && !dueDate) return;
    update((d) => ({
      ...d,
      pregnancy: {
        ...(d.pregnancy ?? EMPTY.pregnancy!),
        active: true,
        lmp: lmp || undefined,
        dueDate: dueDate || undefined,
        startWeightKg: startWeight ? Number(startWeight) : undefined,
        multiples: Number(multiples) || 1,
        endedAt: undefined,
      },
      postpartum: {
        ...(d.postpartum ?? EMPTY.postpartum!),
        active: false,
        endedAt: d.postpartum?.active ? (d.postpartum.endedAt ?? todayKey()) : d.postpartum?.endedAt,
      },
      settings: {
        ...d.settings,
        pregnantSince: undefined,
      },
      profile: {
        ...(d.profile ?? {}),
        pregnancyStatus: "none",
        postpartum: undefined,
      },
    }));
  };

  return (
    <Section title="Set up pregnancy mode" icon="🤰">
      <div className="space-y-3">
        <Field label="First day of last menstrual period">
          <Input type="date" className="h-11" value={lmp} onChange={(e) => setLmp(e.target.value)} />
        </Field>
        <p className="text-center text-xs text-muted-foreground">{t("— or —")}</p>
        <Field label="Estimated due date">
          <Input type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Starting weight (kg)">
          <Input
            inputMode="decimal"
            className="h-11"
            value={startWeight}
            onChange={(e) => setStartWeight(e.target.value)}
          />
        </Field>
        <Field label="Multiples (twins etc.)">
          <Input
            inputMode="numeric"
            className="h-11"
            value={multiples}
            onChange={(e) => setMultiples(e.target.value)}
          />
        </Field>
        <Button type="button" className="h-11 w-full" onClick={submit}>
          {t("Start tracking")}
        </Button>
      </div>
    </Section>
  );
}

function HeroSection({
  view,
  update,
  progress,
}: {
  view: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  progress: ReturnType<typeof pregnancyProgress>;
}) {
  const { t, language } = useI18n();
  const p = view.pregnancy ?? EMPTY.pregnancy!;
  const due = dueDateOf(p);
  if (!progress) return null;
  return (
    <section className="rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/20 dark:bg-primary/20">
      <p className="text-xs uppercase tracking-wider text-primary">
        {t("Week")} {progress.week} + {progress.dayOfWeek} · {t("Trimester")} {progress.trimester}
      </p>
      <p className="mt-1 font-serif text-3xl">{progress.days} {t("days pregnant")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Due")} {due ? fromKey(due).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
        {progress.daysLeft != null ? ` · ${progress.daysLeft} ${t("days left")}` : ""}
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-tint">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-1 text-right text-[10px] text-muted-foreground">{progress.percent}%</p>
    </section>
  );
}

function BabySizeCard({ week }: { week: number }) {
  const { t } = useI18n();
  const size = babySize(week);
  if (!size) return null;
  return (
    <Section title="Baby size this week" icon="🍼">
      <p className="font-serif text-2xl">{t(size.size)}</p>
      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
        {size.lengthCm != null && <span>{size.lengthCm} cm</span>}
        {size.weightG != null && <span>{size.weightG} g</span>}
      </div>
    </Section>
  );
}

function WeightSection({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const { t } = useI18n();
  const p = view.pregnancy ?? EMPTY.pregnancy!;
  const today = todayKey();
  const todayWeight = view.dayLogs[today]?.pregnancy?.weightKg;
  const [input, setInput] = useState(todayWeight != null ? String(todayWeight) : "");

  const save = () => {
    const v = Number(input);
    if (!v) return;
    updateDayLog(update, today, (log) => ({ ...log, pregnancy: { ...(log.pregnancy ?? {}), weightKg: v } }));
  };

  const points = Object.entries(view.dayLogs)
    .filter(([, l]) => l.pregnancy?.weightKg != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, l]) => ({ key: k, label: `${k.slice(5, 7)}/${k.slice(8, 10)}`, value: l.pregnancy!.weightKg! }));

  const latest = points.length ? points[points.length - 1].value : undefined;
  const gain = latest != null && p.startWeightKg != null ? latest - p.startWeightKg : undefined;

  return (
    <Section title="Weight gain" icon="⚖️">
      <div className="flex gap-2">
        <Input
          inputMode="decimal"
          className="h-11"
          placeholder={t("Weight (kg)")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={t("Today's weight")}
        />
        <Button type="button" className="h-11" onClick={save}>
          Log
        </Button>
      </div>
      {gain != null && (
        <p className="mt-2 text-sm text-muted-foreground">
          Total gain:{" "}
          <span className="font-medium text-foreground">
            {gain >= 0 ? "+" : ""}
            {gain.toFixed(1)} kg
          </span>
        </p>
      )}
      <div className="mt-3">
        <SimpleLineChart points={points} unit="kg" />
      </div>
    </Section>
  );
}

function RecentBP({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const entries = Object.entries(view.dayLogs)
    .flatMap(([k, l]) => (l.pregnancy?.bloodPressure ?? []).map((e) => ({ ...e, date: k })))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5);

  if (!entries.length) return null;

  const remove = (date: string, id: string) => {
    if (!window.confirm("Delete this blood pressure entry?")) return;
    updateDayLog(update, date, (log) => ({
      ...log,
      pregnancy: {
        ...(log.pregnancy ?? {}),
        bloodPressure: (log.pregnancy?.bloodPressure ?? []).filter((entry) => entry.id !== id),
      },
    }));
  };

  return (
    <ul className="mt-3 space-y-1 text-sm">
      {entries.map((e) => (
        <li
          key={`${e.date}-${e.id}`}
          className="flex items-center gap-2 rounded-xl bg-tint px-3 py-2 ring-1 ring-border/40"
        >
          <span className="min-w-0 flex-1">
            {e.date} {e.time} · {e.systolic}/{e.diastolic}
            {e.pulse ? ` · ${e.pulse} bpm` : ""}
          </span>
          <button
            type="button"
            onClick={() => remove(e.date, e.id)}
            aria-label="Delete blood pressure entry"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function RecentBS({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const entries = Object.entries(view.dayLogs)
    .flatMap(([k, l]) => (l.pregnancy?.bloodSugar ?? []).map((e) => ({ ...e, date: k })))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 5);

  if (!entries.length) return null;

  const remove = (date: string, id: string) => {
    if (!window.confirm("Delete this blood sugar entry?")) return;
    updateDayLog(update, date, (log) => ({
      ...log,
      pregnancy: {
        ...(log.pregnancy ?? {}),
        bloodSugar: (log.pregnancy?.bloodSugar ?? []).filter((entry) => entry.id !== id),
      },
    }));
  };

  return (
    <ul className="mt-3 space-y-1 text-sm">
      {entries.map((e) => (
        <li
          key={`${e.date}-${e.id}`}
          className="flex items-center gap-2 rounded-xl bg-tint px-3 py-2 ring-1 ring-border/40"
        >
          <span className="min-w-0 flex-1">
            {e.date} {e.time} · {e.value} mmol/L{e.context ? ` (${e.context})` : ""}
          </span>
          <button
            type="button"
            onClick={() => remove(e.date, e.id)}
            aria-label="Delete blood sugar entry"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function AppointmentsSection({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const p = view.pregnancy ?? EMPTY.pregnancy!;
  const [editing, setEditing] = useState<PregnancyAppointment | "new" | null>(null);

  const save = (a: PregnancyAppointment) => {
    update((d) => {
      const cur = d.pregnancy ?? EMPTY.pregnancy!;
      const exists = cur.appointments.some((x) => x.id === a.id);
      return {
        ...d,
        pregnancy: {
          ...cur,
          appointments: exists ? cur.appointments.map((x) => (x.id === a.id ? a : x)) : [...cur.appointments, a],
        },
      };
    });
    setEditing(null);
  };
  const remove = (id: string) =>
    update((d) => ({
      ...d,
      pregnancy: {
        ...(d.pregnancy ?? EMPTY.pregnancy!),
        appointments: (d.pregnancy?.appointments ?? []).filter((x) => x.id !== id),
      },
    }));

  return (
    <Section title="Appointments & ultrasounds" icon="📅">
      {editing ? (
        <AppointmentForm
          initial={editing === "new" ? undefined : editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" className="mb-3" onClick={() => setEditing("new")}>
          + Add appointment
        </Button>
      )}
      <AppointmentList appointments={p.appointments} onEdit={(a) => setEditing(a)} onDelete={remove} />
    </Section>
  );
}

function SymptomsSection({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const { t } = useI18n();
  const today = todayKey();
  const log = view.dayLogs[today]?.pregnancy ?? {};
  const goal = view.profile?.hydrationGoalMl ?? 2000;

  const patch = (partial: Partial<typeof log>) =>
    updateDayLog(update, today, (l) => ({ ...l, pregnancy: { ...(l.pregnancy ?? {}), ...partial } }));

  const toggleSymptom = (s: string) => {
    const cur = log.symptoms ?? [];
    patch({ symptoms: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };
  const toggleMood = (m: string) => {
    const cur = log.mood ?? [];
    patch({ mood: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] });
  };

  return (
    <Section title="Today's symptoms" icon="📝">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">{t("Symptoms")}</p>
          <div className="flex flex-wrap gap-2">
            {PREGNANCY_SYMPTOMS.map((s) => (
              <Chip key={s} label={s} active={(log.symptoms ?? []).includes(s)} onClick={() => toggleSymptom(s)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">{t("Mood")}</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_CHIPS.map((m) => (
              <Chip key={m} label={m} active={(log.mood ?? []).includes(m)} onClick={() => toggleMood(m)} />
            ))}
          </div>
        </div>

        <Slider0to10 label="Energy" value={log.energy} onChange={(v) => patch({ energy: v })} />
        <Slider0to10 label="Swelling" value={log.swelling} onChange={(v) => patch({ swelling: v })} />
        <Slider0to10 label="Heartburn" value={log.heartburn} onChange={(v) => patch({ heartburn: v })} />
        <Slider0to10 label="Nausea" value={log.nausea} onChange={(v) => patch({ nausea: v })} />
        <Slider0to10 label="Vomiting" value={log.vomiting} onChange={(v) => patch({ vomiting: v })} />

        <Field label="Sleep hours">
          <Input
            type="number"
            inputMode="decimal"
            className="h-11"
            value={log.sleepHours ?? ""}
            onChange={(e) => patch({ sleepHours: Number(e.target.value) || undefined })}
          />
        </Field>

        <TagList label="Cravings" values={log.cravings ?? []} onChange={(v) => patch({ cravings: v })} />
        <TagList label="Aversions" values={log.aversions ?? []} onChange={(v) => patch({ aversions: v })} />

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("Water intake")}</span>
            <span className="tabular-nums font-medium text-foreground">
              {log.waterMl ?? 0} / {goal} ml
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-tint">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, ((log.waterMl ?? 0) / goal) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patch({ waterMl: (log.waterMl ?? 0) + 250 })}
            >
              +250 ml
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patch({ waterMl: Math.max(0, (log.waterMl ?? 0) - 250) })}
            >
              -250 ml
            </Button>
          </div>
        </div>

        <Field label="Note">
          <Textarea value={log.note ?? ""} onChange={(e) => patch({ note: e.target.value })} />
        </Field>
      </div>
    </Section>
  );
}

function PhotosSection({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const today = todayKey();
  const log = view.dayLogs[today]?.pregnancy ?? {};
  const [viewing, setViewing] = useState<string | null>(null);

  const addFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateDayLog(update, today, (l) => ({
        ...l,
        pregnancy: { ...(l.pregnancy ?? {}), photos: [...(l.pregnancy?.photos ?? []), dataUrl] },
      }));
    };
    reader.readAsDataURL(file);
  };
  const remove = (photo: string) =>
    updateDayLog(update, today, (l) => ({
      ...l,
      pregnancy: { ...(l.pregnancy ?? {}), photos: (l.pregnancy?.photos ?? []).filter((p) => p !== photo) },
    }));

  return (
    <Section title="Bump photos" icon="📷">
      <label className="inline-flex">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addFile(f);
            e.currentTarget.value = "";
          }}
        />
        <span className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
          Add photo
        </span>
      </label>
      {(log.photos ?? []).length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {log.photos!.map((photo, i) => (
            <div key={i} className="relative aspect-square">
              <button
                type="button"
                aria-label="View photo"
                onClick={() => setViewing(photo)}
                className="h-full w-full overflow-hidden rounded-lg ring-1 ring-border"
              >
                <img src={photo} alt="Bump" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                aria-label="Delete photo"
                onClick={() => remove(photo)}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
        >
          <img src={viewing} alt="Bump full size" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </Section>
  );
}

