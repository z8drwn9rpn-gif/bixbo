import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  Clock,
  Pencil,
  UserRound,
  HeartPulse,
  Pill,
  Baby,
  Stethoscope,
  TriangleAlert,
  Phone,
  Ruler,
  Scale,
  Target,
  CalendarDays,
  ChevronRight,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, type HealthProfile, type Doctor, type EmergencyContact } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Health profile — BIXBO" },
      {
        name: "description",
        content: "Your personal, medical, cycle, lifestyle, emergency and medication profile in BIXBO.",
      },
      { property: "og:title", content: "Health profile — BIXBO" },
      { property: "og:description", content: "Everything about you, in one editable place." },
    ],
  }),
  component: ProfilePage,
});

/* ------------------------------ small primitives ------------------------------ */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">{placeholder ?? "— Select —"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked
          ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground"
          : "border-border bg-tint"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-primary justify-end" : "bg-muted justify-start"} p-0.5`}
      >
        <span className="h-4 w-4 rounded-full bg-background shadow" />
      </span>
    </button>
  );
}

function TagListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    if (values.includes(v)) {
      setText("");
      return;
    }
    onChange([...values, v]);
    setText("");
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          aria-label={`Add ${label}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Type and press Add…"}
          className="h-11"
        />
        <Button type="button" size="sm" onClick={add} className="h-11 min-w-11 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => remove(v)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Doctor | undefined;
  onChange: (next: Doctor) => void;
}) {
  const v = value ?? {};
  const set = (patch: Partial<Doctor>) => onChange({ ...v, ...patch });
  const idBase = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name" htmlFor={`${idBase}-name`}>
          <Input
            id={`${idBase}-name`}
            className="h-11"
            value={v.name ?? ""}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Clinic" htmlFor={`${idBase}-clinic`}>
          <Input
            id={`${idBase}-clinic`}
            className="h-11"
            value={v.clinic ?? ""}
            onChange={(e) => set({ clinic: e.target.value })}
          />
        </Field>
        <Field label="Phone" htmlFor={`${idBase}-phone`}>
          <Input
            id={`${idBase}-phone`}
            className="h-11"
            type="tel"
            value={v.phone ?? ""}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Email" htmlFor={`${idBase}-email`}>
          <Input
            id={`${idBase}-email`}
            className="h-11"
            type="email"
            value={v.email ?? ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-2">
        <Field label="Note" htmlFor={`${idBase}-note`}>
          <Textarea id={`${idBase}-note`} value={v.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ------------------------------ summary primitives ------------------------------ */

function SummaryCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint text-primary ring-1 ring-border/50">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryStat({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-tint px-3 py-3 ring-1 ring-border/40">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">{value || "—"}</p>
    </div>
  );
}

function SummaryChips({ values, emptyText = "Not added" }: { values: string[]; emptyText?: string }) {
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border/50"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function formatProfileDate(value?: string) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------ page ------------------------------ */

function ageFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function ProfilePage() {
  const navigate = useNavigate();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const profile: HealthProfile = view.profile ?? {};
  const [editing, setEditing] = useState(false);

  const patch = (p: Partial<HealthProfile>) => update((d) => ({ ...d, profile: { ...d.profile, ...p } }));

  const age = ageFromBirthDate(profile.birthDate);
  const bmi =
    profile.heightCm && profile.weightKg && profile.heightCm > 0
      ? profile.weightKg / ((profile.heightCm / 100) * (profile.heightCm / 100))
      : null;

  const setEmergency = (p: Partial<EmergencyContact>) =>
    patch({ emergencyContact: { ...profile.emergencyContact, ...p } });

  const [newTime, setNewTime] = useState("08:00");
  const reminderTimes = profile.reminderTimes ?? [];
  const addTime = () => {
    if (!newTime || reminderTimes.includes(newTime)) return;
    patch({ reminderTimes: [...reminderTimes, newTime].sort() });
  };
  const removeTime = (t: string) => patch({ reminderTimes: reminderTimes.filter((x) => x !== t) });

  const doctors = [
    { label: "GP", value: profile.gp },
    { label: "Gynecologist", value: profile.gynecologist },
    { label: "Neurologist", value: profile.neurologist },
    { label: "Endocrinologist", value: profile.endocrinologist },
    { label: "Therapist", value: profile.therapist },
  ].filter((doctor) => doctor.value?.name || doctor.value?.clinic || doctor.value?.phone || doctor.value?.email);

  const activeMedications = view.meds.filter((med) => med.name.trim().length > 0);

  const medicalTags = [...(profile.diagnoses ?? []), ...(profile.chronicIllnesses ?? [])];

  const allergyTags = [...(profile.allergies ?? []), ...(profile.intolerances ?? [])];

  const pregnancyLabel = view.pregnancy?.active
    ? "Active pregnancy"
    : view.postpartum?.active
      ? "Postpartum"
      : profile.pregnancyStatus && profile.pregnancyStatus !== "none"
        ? profile.pregnancyStatus.charAt(0).toUpperCase() + profile.pregnancyStatus.slice(1)
        : "Not active";

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Health profile
        </button>
      }
      right={
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-tint"
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editing ? "Done" : "Edit"}
        </button>
      }
    >
      {editing ? (
        <div className="space-y-4 px-5 pt-4 pb-28">
          {/* ---------------- Personal ---------------- */}
          <Section title="Personal" subtitle="Basic information about you.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" htmlFor="p-name">
                <Input
                  id="p-name"
                  className="h-11"
                  value={profile.name ?? ""}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field label="Nickname" htmlFor="p-nickname">
                <Input
                  id="p-nickname"
                  className="h-11"
                  value={profile.nickname ?? ""}
                  onChange={(e) => patch({ nickname: e.target.value })}
                />
              </Field>
              <Field label="Birth date" htmlFor="p-birthdate">
                <Input
                  id="p-birthdate"
                  type="date"
                  className="h-11"
                  value={profile.birthDate ?? ""}
                  onChange={(e) => patch({ birthDate: e.target.value })}
                />
              </Field>
              <Field label="Age">
                <div className="flex h-11 items-center rounded-md border border-input bg-tint px-3 text-sm text-muted-foreground">
                  {age !== null ? `${age} years` : "—"}
                </div>
              </Field>
              <Field label="Height (cm)" htmlFor="p-height">
                <Input
                  id="p-height"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.heightCm ?? ""}
                  onChange={(e) => patch({ heightCm: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="Weight (kg)" htmlFor="p-weight">
                <Input
                  id="p-weight"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.weightKg ?? ""}
                  onChange={(e) => patch({ weightKg: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="Target weight (kg)" htmlFor="p-target-weight">
                <Input
                  id="p-target-weight"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.targetWeightKg ?? ""}
                  onChange={(e) =>
                    patch({ targetWeightKg: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="BMI">
                <div className="flex h-11 items-center rounded-md border border-input bg-tint px-3 text-sm text-muted-foreground">
                  {bmi ? bmi.toFixed(1) : "—"}
                </div>
              </Field>
              <Field label="Gender" htmlFor="p-gender">
                <Input
                  id="p-gender"
                  className="h-11"
                  value={profile.gender ?? ""}
                  onChange={(e) => patch({ gender: e.target.value })}
                />
              </Field>
              <Field label="Pronouns" htmlFor="p-pronouns">
                <Input
                  id="p-pronouns"
                  className="h-11"
                  value={profile.pronouns ?? ""}
                  onChange={(e) => patch({ pronouns: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          {/* ---------------- Medical ---------------- */}
          <Section title="Medical" subtitle="Diagnoses, conditions and history.">
            <TagListField
              label="Diagnoses"
              values={profile.diagnoses ?? []}
              onChange={(v) => patch({ diagnoses: v })}
            />
            <TagListField
              label="Chronic illnesses"
              values={profile.chronicIllnesses ?? []}
              onChange={(v) => patch({ chronicIllnesses: v })}
            />
            <TagListField
              label="Allergies"
              values={profile.allergies ?? []}
              onChange={(v) => patch({ allergies: v })}
            />
            <TagListField
              label="Intolerances"
              values={profile.intolerances ?? []}
              onChange={(v) => patch({ intolerances: v })}
            />
            <TagListField
              label="Surgeries"
              values={profile.surgeries ?? []}
              onChange={(v) => patch({ surgeries: v })}
            />
            <TagListField
              label="Pregnancies"
              values={profile.pregnancies ?? []}
              onChange={(v) => patch({ pregnancies: v })}
            />
            <TagListField
              label="Disabilities"
              values={profile.disabilities ?? []}
              onChange={(v) => patch({ disabilities: v })}
            />
          </Section>

          {/* ---------------- Cycle ---------------- */}
          <Section title="Cycle" subtitle="Reproductive and hormonal status.">
            <Field label="Pregnancy status" htmlFor="p-preg-status">
              <SelectField
                id="p-preg-status"
                value={profile.pregnancyStatus}
                onChange={(v) => patch({ pregnancyStatus: v as HealthProfile["pregnancyStatus"] })}
                options={[
                  { value: "none", label: "None" },
                  { value: "pregnant", label: "Pregnant" },
                  { value: "postpartum", label: "Postpartum" },
                  { value: "trying", label: "Trying" },
                  { value: "unsure", label: "Unsure" },
                ]}
              />
            </Field>
            <div className="grid grid-cols-1 gap-2">
              <ToggleRow
                label="Trying to conceive"
                checked={!!profile.tryingToConceive}
                onChange={(v) => patch({ tryingToConceive: v })}
              />
              <ToggleRow label="Postpartum" checked={!!profile.postpartum} onChange={(v) => patch({ postpartum: v })} />
              <ToggleRow
                label="Breastfeeding"
                checked={!!profile.breastfeeding}
                onChange={(v) => patch({ breastfeeding: v })}
              />
            </div>
            <Field label="Menopause" htmlFor="p-menopause">
              <SelectField
                id="p-menopause"
                value={profile.menopause}
                onChange={(v) => patch({ menopause: v as HealthProfile["menopause"] })}
                options={[
                  { value: "no", label: "No" },
                  { value: "peri", label: "Perimenopause" },
                  { value: "post", label: "Postmenopause" },
                ]}
              />
            </Field>
            <Field label="Birth control" htmlFor="p-birth-control">
              <Input
                id="p-birth-control"
                className="h-11"
                value={profile.birthControl ?? ""}
                onChange={(e) => patch({ birthControl: e.target.value })}
              />
            </Field>
            <Field label="Fertility goals" htmlFor="p-fertility-goals">
              <Input
                id="p-fertility-goals"
                className="h-11"
                value={profile.fertilityGoals ?? ""}
                onChange={(e) => patch({ fertilityGoals: e.target.value })}
              />
            </Field>
          </Section>

          {/* ---------------- Lifestyle ---------------- */}
          <Section title="Lifestyle" subtitle="Habits that affect your health.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Smoking" htmlFor="p-smoker">
                <SelectField
                  id="p-smoker"
                  value={profile.smoker}
                  onChange={(v) => patch({ smoker: v as HealthProfile["smoker"] })}
                  options={[
                    { value: "no", label: "No" },
                    { value: "occasionally", label: "Occasionally" },
                    { value: "daily", label: "Daily" },
                    { value: "quit", label: "Quit" },
                  ]}
                />
              </Field>
              <Field label="Alcohol" htmlFor="p-alcohol">
                <SelectField
                  id="p-alcohol"
                  value={profile.alcohol}
                  onChange={(v) => patch({ alcohol: v as HealthProfile["alcohol"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "rarely", label: "Rarely" },
                    { value: "weekly", label: "Weekly" },
                    { value: "daily", label: "Daily" },
                  ]}
                />
              </Field>
              <Field label="Caffeine" htmlFor="p-caffeine">
                <SelectField
                  id="p-caffeine"
                  value={profile.caffeine}
                  onChange={(v) => patch({ caffeine: v as HealthProfile["caffeine"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </Field>
              <Field label="Exercise" htmlFor="p-exercise">
                <SelectField
                  id="p-exercise"
                  value={profile.exercise}
                  onChange={(v) => patch({ exercise: v as HealthProfile["exercise"] })}
                  options={[
                    { value: "none", label: "None" },
                    { value: "light", label: "Light" },
                    { value: "moderate", label: "Moderate" },
                    { value: "intense", label: "Intense" },
                  ]}
                />
              </Field>
              <Field label="Sleep goal (hours)" htmlFor="p-sleep-goal">
                <Input
                  id="p-sleep-goal"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={profile.sleepGoalHours ?? ""}
                  onChange={(e) =>
                    patch({ sleepGoalHours: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Hydration goal (ml)" htmlFor="p-hydration-goal">
                <Input
                  id="p-hydration-goal"
                  type="number"
                  inputMode="numeric"
                  className="h-11"
                  value={profile.hydrationGoalMl ?? ""}
                  onChange={(e) =>
                    patch({ hydrationGoalMl: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Section>

          {/* ---------------- Emergency ---------------- */}
          <Section title="Emergency" subtitle="In case of emergency — contact and care team.">
            <Field label="Blood type" htmlFor="p-blood-type">
              <SelectField
                id="p-blood-type"
                value={profile.bloodType}
                onChange={(v) => patch({ bloodType: v })}
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => ({ value: v, label: v }))}
              />
            </Field>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Emergency contact</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name" htmlFor="p-ec-name">
                  <Input
                    id="p-ec-name"
                    className="h-11"
                    value={profile.emergencyContact?.name ?? ""}
                    onChange={(e) => setEmergency({ name: e.target.value })}
                  />
                </Field>
                <Field label="Relation" htmlFor="p-ec-relation">
                  <Input
                    id="p-ec-relation"
                    className="h-11"
                    value={profile.emergencyContact?.relation ?? ""}
                    onChange={(e) => setEmergency({ relation: e.target.value })}
                  />
                </Field>
                <Field label="Phone" htmlFor="p-ec-phone">
                  <Input
                    id="p-ec-phone"
                    type="tel"
                    className="h-11"
                    value={profile.emergencyContact?.phone ?? ""}
                    onChange={(e) => setEmergency({ phone: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <DoctorForm title="GP" value={profile.gp} onChange={(v) => patch({ gp: v })} />
            <DoctorForm
              title="Gynecologist"
              value={profile.gynecologist}
              onChange={(v) => patch({ gynecologist: v })}
            />
            <DoctorForm title="Neurologist" value={profile.neurologist} onChange={(v) => patch({ neurologist: v })} />
            <DoctorForm
              title="Endocrinologist"
              value={profile.endocrinologist}
              onChange={(v) => patch({ endocrinologist: v })}
            />
            <DoctorForm title="Therapist" value={profile.therapist} onChange={(v) => patch({ therapist: v })} />
          </Section>

          {/* ---------------- Medication ---------------- */}
          <Section title="Medication" subtitle="Reminders, pharmacy and notes.">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Reminder times</label>
              <div className="flex gap-2">
                <Input
                  aria-label="New reminder time"
                  type="time"
                  className="h-11"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
                <Button type="button" size="sm" onClick={addTime} className="h-11 min-w-11 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {reminderTimes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reminderTimes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border"
                    >
                      <Clock className="h-3 w-3" /> {t}
                      <button
                        type="button"
                        aria-label={`Remove reminder ${t}`}
                        onClick={() => removeTime(t)}
                        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Field label="Pharmacy" htmlFor="p-pharmacy">
              <Input
                id="p-pharmacy"
                className="h-11"
                value={profile.pharmacy ?? ""}
                onChange={(e) => patch({ pharmacy: e.target.value })}
              />
            </Field>
            <Field label="Medication notes" htmlFor="p-med-notes">
              <Textarea
                id="p-med-notes"
                value={profile.medicationNotes ?? ""}
                onChange={(e) => patch({ medicationNotes: e.target.value })}
              />
            </Field>
          </Section>
        </div>
      ) : (
        <div className="space-y-4 px-5 pb-28 pt-4">
          <section className="overflow-hidden rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/20">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-surface text-primary ring-1 ring-border/60">
                <UserRound className="h-8 w-8" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Health profile
                </p>
                <h1 className="mt-1 truncate font-serif text-2xl font-bold text-foreground">
                  {profile.name?.trim() || view.settings.userName?.trim() || "Your profile"}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {profile.nickname?.trim() ? `@${profile.nickname.trim()}` : "Personal health summary"}
                </p>
              </div>
            </div>
          </section>

          <SummaryCard icon={<UserRound className="h-5 w-5" />} title="Personal" subtitle="Your main profile details">
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Birth date"
                value={formatProfileDate(profile.birthDate)}
              />
              <SummaryStat label="Age" value={age !== null ? `${age} years` : "—"} />
              <SummaryStat
                icon={<Ruler className="h-3.5 w-3.5" />}
                label="Height"
                value={profile.heightCm != null ? `${profile.heightCm} cm` : "—"}
              />
              <SummaryStat
                icon={<Scale className="h-3.5 w-3.5" />}
                label="Weight"
                value={profile.weightKg != null ? `${profile.weightKg} kg` : "—"}
              />
              <SummaryStat
                icon={<Target className="h-3.5 w-3.5" />}
                label="Goal"
                value={profile.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "—"}
              />
              <SummaryStat label="BMI" value={bmi != null ? bmi.toFixed(1) : "—"} />
              <SummaryStat label="Gender" value={profile.gender || "—"} />
              <SummaryStat label="Pronouns" value={profile.pronouns || "—"} />
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<HeartPulse className="h-5 w-5" />}
            title="Medical"
            subtitle={`${medicalTags.length} saved condition${medicalTags.length === 1 ? "" : "s"}`}
          >
            <SummaryChips values={medicalTags} emptyText="No diagnoses or chronic conditions added." />

            {(profile.surgeries?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Surgeries
                </p>
                <SummaryChips values={profile.surgeries ?? []} />
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<TriangleAlert className="h-5 w-5" />}
            title="Allergies & intolerances"
            subtitle="Important sensitivities"
          >
            <SummaryChips values={allergyTags} emptyText="No allergies or intolerances added." />
          </SummaryCard>

          <SummaryCard
            icon={<Pill className="h-5 w-5" />}
            title="Medication"
            subtitle={`${activeMedications.length} active medication${activeMedications.length === 1 ? "" : "s"}`}
          >
            {activeMedications.length > 0 ? (
              <div className="space-y-2">
                {activeMedications.slice(0, 4).map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{med.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[med.dose, med.times?.join(", ")].filter(Boolean).join(" · ") || "No schedule"}
                      </p>
                    </div>
                    <Pill className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                ))}

                {activeMedications.length > 4 && (
                  <p className="px-1 text-xs text-muted-foreground">
                    +{activeMedications.length - 4} more medication{activeMedications.length - 4 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No medications added.</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<Baby className="h-5 w-5" />}
            title="Reproductive health"
            subtitle="Pregnancy, postpartum and hormonal status"
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Status" value={pregnancyLabel} />
              <SummaryStat label="Birth control" value={profile.birthControl || "—"} />
              <SummaryStat label="Breastfeeding" value={profile.breastfeeding ? "Yes" : "No"} />
              <SummaryStat
                label="Menopause"
                value={profile.menopause ? profile.menopause.charAt(0).toUpperCase() + profile.menopause.slice(1) : "—"}
              />
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<Stethoscope className="h-5 w-5" />}
            title="Doctors"
            subtitle={`${doctors.length} saved doctor${doctors.length === 1 ? "" : "s"}`}
          >
            {doctors.length > 0 ? (
              <div className="space-y-2">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.label}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{doctor.label}</p>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {doctor.value?.name || doctor.value?.clinic || "Saved"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No doctors added.</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<Phone className="h-5 w-5" />}
            title="Emergency"
            subtitle={profile.bloodType ? `Blood type ${profile.bloodType}` : "Emergency contact and blood type"}
          >
            {profile.emergencyContact?.name || profile.emergencyContact?.phone || profile.emergencyContact?.relation ? (
              <div className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
                <p className="text-sm font-semibold text-foreground">
                  {profile.emergencyContact?.name || "Emergency contact"}
                </p>
                {profile.emergencyContact?.relation && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{profile.emergencyContact.relation}</p>
                )}
                {profile.emergencyContact?.phone && (
                  <p className="mt-2 text-sm font-medium tabular-nums text-primary">{profile.emergencyContact.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emergency contact added.</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<HeartPulse className="h-5 w-5" />}
            title="Lifestyle"
            subtitle="Daily health goals and habits"
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Exercise" value={profile.exercise || "—"} />
              <SummaryStat
                label="Sleep goal"
                value={profile.sleepGoalHours != null ? `${profile.sleepGoalHours} h` : "—"}
              />
              <SummaryStat
                label="Hydration"
                value={profile.hydrationGoalMl != null ? `${profile.hydrationGoalMl} ml` : "—"}
              />
              <SummaryStat label="Caffeine" value={profile.caffeine || "—"} />
            </div>
          </SummaryCard>

          <Button
            type="button"
            onClick={() => setEditing(true)}
            className="h-12 w-full rounded-2xl text-base font-semibold"
          >
            <Pencil className="h-4 w-4" />
            Edit health profile
          </Button>
        </div>
      )}
    </AppShell>
  );
}
