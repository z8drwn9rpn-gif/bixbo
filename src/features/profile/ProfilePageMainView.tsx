import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { postpartumProgress } from "@/lib/health";
import { ArrowLeft, Plus, X, Pencil, ChevronRight, Check } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import {
  BabyIcon,
  CalendarIcon,
  ClockIcon,
  DropIcon,
  HeartIcon,
  LeafIcon,
  NoteIcon,
  PillIcon,
  PregnancyIcon,
  ProfileIcon,
  StarIcon,
  StethoscopeIcon,
  TaskIcon,
  WarningIcon,
  WeightIcon,
  WorkoutIcon,
} from "@/components/icons/BixboIcons";
import {
  useBixbo,
  getBixbo,
  EMPTY,
  todayKey,
  latestRecordedWeight,
  userAllergens,
  userGender,
  isPregnancyActive,
  isPostpartumActive,
  normalizeBixboBackup,
  replaceBixbo,
  createBixboSafetyBackup,
  getBixboSafetyBackup,
  type BixboData,
  type HealthProfile,
  type Doctor,
  type EmergencyContact,
} from "@/lib/storage";
import { mergeBixbo } from "@/lib/merge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { createCloudBackup } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import type { AppLanguage } from "@/lib/i18n";
import { isDeviceAdminEnabled } from "@/lib/deviceAdmin";
import { TrText, Section, Field, SelectField, ToggleRow, TagListField, DoctorForm, SummaryCard, SummaryStat, SummaryChips, formatProfileDate, ageFromBirthDate, HubRow, HealthHub, HealthSubpage, PreferenceOption } from "./shared";
import type { HealthView } from "./shared";
import type { ProfilePageModel } from "./useProfilePageModel";
export function ProfilePageMainView({ model }: { model: ProfilePageModel }) { const { navigate, data, update, hydrated, language, setLanguage, t, view, profile, editing, setEditing, healthView, setHealthView, accountAuthBusy, setAccountAuthBusy, accountAuthError, setAccountAuthError, deviceAdminEnabled, trackingPrefs, setTrackingPrefs, painScale, setPainScale, units, setUnits, privacyPrefs, setPrivacyPrefs, backupPrefs, setBackupPrefs, reminderPrefs, setReminderPrefs, prefsLoaded, setPrefsLoaded, syncingPrefsFromStoreRef, prefsSignature, patch, setTheme, setTextSize, exportJson, startAccountOAuth, protectRestoreFromDeletedData, age, currentWeight, gender, pregnancyActive, postpartumActive, allergens, bmi, setEmergency, setCurrentWeight, setGender, reproductiveStatus, setReproductiveStatus, doctors, activeMedications, medicalTags, allergyTags, postpartumStatus, postpartumToday, pregnancyLabel, allDayLogs, totalPainLogs, totalBowelLogs, totalSleepLogs, totalTetanyLogs, trackedDates, firstTrackedDate, trackingDays } = model;
return (
    <AppShell
      title={
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setHealthView("hub");
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" /> Health Summary
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
              <Field label="Current weight (kg)" htmlFor="p-weight">
                <Input
                  id="p-weight"
                  type="number"
                  inputMode="decimal"
                  className="h-11"
                  value={currentWeight ?? ""}
                  onChange={(e) => setCurrentWeight(e.target.value === "" ? undefined : Number(e.target.value))}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("Saved as today's dated weight entry.")}</p>
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
                <SelectField
                  id="p-gender"
                  value={gender}
                  onChange={(value) => setGender(value as "female" | "male")}
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                  ]}
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
              label="Diagnosed conditions"
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
              values={allergens}
              onChange={(values) =>
                update((d) => ({
                  ...d,
                  profile: {
                    ...(d.profile ?? {}),
                    allergies: values,
                  },
                  settings: {
                    ...d.settings,
                    allergens: undefined,
                  },
                }))
              }
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
            <Field label="Reproductive status" htmlFor="p-preg-status">
              <SelectField
                id="p-preg-status"
                value={reproductiveStatus}
                onChange={(value) => setReproductiveStatus(value as NonNullable<HealthProfile["pregnancyStatus"]>)}
                options={[
                  { value: "none", label: "None" },
                  { value: "pregnant", label: "Pregnant" },
                  { value: "postpartum", label: "Postpartum" },
                  { value: "trying", label: "Trying" },
                  { value: "unsure", label: "Unsure" },
                ]}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Pregnancy and postpartum modes are synchronized across the whole app.
              </p>
            </Field>
            <div className="grid grid-cols-1 gap-2">
              <ToggleRow
                label="Trying to conceive"
                checked={!!profile.tryingToConceive}
                onChange={(value) => patch({ tryingToConceive: value })}
              />
              <ToggleRow
                label="Breastfeeding"
                checked={!!profile.breastfeeding}
                onChange={(value) => patch({ breastfeeding: value })}
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
              <p className="mb-2 text-xs font-semibold text-foreground">{t("Emergency contact")}</p>
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
          <Section title="Medication" subtitle="Medication schedules are managed from the Medications page.">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/meds" })} className="w-full">
              <PillIcon size={18} />
              Manage medications and reminder times
            </Button>

            <Field label="Pharmacy" htmlFor="p-pharmacy">
              <Input
                id="p-pharmacy"
                className="h-11"
                value={profile.pharmacy ?? ""}
                onChange={(e) => patch({ pharmacy: e.target.value })}
              />
            </Field>

            <Field label="General medication notes" htmlFor="p-med-notes">
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
                <ProfileIcon size={36} />
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

          <SummaryCard icon={<ProfileIcon size={24} />} title="Personal" subtitle="Your main profile details">
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat
                icon={<CalendarIcon size={16} />}
                label="Birth date"
                value={formatProfileDate(profile.birthDate)}
              />
              <SummaryStat label="Age" value={age !== null ? `${age} years` : "—"} />
              <SummaryStat
                icon={<ProfileIcon size={16} />}
                label="Height"
                value={profile.heightCm != null ? `${profile.heightCm} cm` : "—"}
              />
              <SummaryStat
                icon={<WeightIcon size={16} />}
                label="Weight"
                value={currentWeight != null ? `${currentWeight} kg` : "—"}
              />
              <SummaryStat
                icon={<WeightIcon size={16} />}
                label="Goal"
                value={profile.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "—"}
              />
              <SummaryStat label="BMI" value={bmi != null ? bmi.toFixed(1) : "—"} />
              <SummaryStat label="Gender" value={gender.charAt(0).toUpperCase() + gender.slice(1)} />
              <SummaryStat label="Pronouns" value={profile.pronouns || "—"} />
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<HeartIcon size={24} />}
            title="Medical"
            subtitle={`${medicalTags.length} saved condition${medicalTags.length === 1 ? "" : "s"}`}
          >
            <SummaryChips values={medicalTags} emptyText="No diagnosed or chronic conditions added." />

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
            icon={<WarningIcon size={24} />}
            title="Allergies & intolerances"
            subtitle="Important sensitivities"
          >
            <SummaryChips values={allergyTags} emptyText="No allergies or intolerances added." />
          </SummaryCard>

          <SummaryCard
            icon={<PillIcon size={24} />}
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
                    <PillIcon size={18} className="shrink-0" />
                  </div>
                ))}

                {activeMedications.length > 4 && (
                  <p className="px-1 text-xs text-muted-foreground">
                    +{activeMedications.length - 4} more medication{activeMedications.length - 4 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No medications added.")}</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={pregnancyActive ? <PregnancyIcon size={24} /> : <BabyIcon size={24} />}
            title="Reproductive health"
            subtitle="Pregnancy, postpartum and hormonal status"
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryStat label="Status" value={pregnancyLabel} />
              {postpartumActive ? (
                <>
                  <SummaryStat
                    label="Postpartum"
                    value={
                      postpartumStatus
                        ? `Week ${postpartumStatus.week} + ${postpartumStatus.dayOfWeek}`
                        : "Birth date missing"
                    }
                  />
                  <SummaryStat label="Symptoms today" value={`${postpartumToday?.symptoms?.length ?? 0}`} />
                  <SummaryStat
                    label="Feeding today"
                    value={`${(postpartumToday?.breastfeeding?.length ?? 0) + (postpartumToday?.pumping?.length ?? 0) + (postpartumToday?.bottle?.length ?? 0)}`}
                  />
                </>
              ) : (
                <>
                  <SummaryStat label="Birth control" value={profile.birthControl || "—"} />
                  <SummaryStat label="Breastfeeding" value={profile.breastfeeding ? "Yes" : "No"} />
                  <SummaryStat
                    label="Menopause"
                    value={
                      profile.menopause ? profile.menopause.charAt(0).toUpperCase() + profile.menopause.slice(1) : "—"
                    }
                  />
                </>
              )}
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<StethoscopeIcon size={24} />}
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
              <p className="text-sm text-muted-foreground">{t("No doctors added.")}</p>
            )}
          </SummaryCard>

          <SummaryCard
            icon={<WarningIcon size={24} />}
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
              <p className="text-sm text-muted-foreground">{t("No emergency contact added.")}</p>
            )}
          </SummaryCard>

          <SummaryCard icon={<WorkoutIcon size={24} />} title="Lifestyle" subtitle="Daily health goals and habits">
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
