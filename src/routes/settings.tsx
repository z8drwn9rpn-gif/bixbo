import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Download,
  Upload,
  Users,
  Type,
  LogOut,
  Cloud,
  Copy,
  RefreshCw,
  Sliders,
  RotateCcw,
  Pill,
  Plus,
  X,
  ListPlus,
  Sun,
  Moon,
  MonitorSmartphone,
  ChevronDown,
  User,
  Palette,
  HeartPulse,
  CalendarClock,
  Baby,
  ShieldCheck,
  FileDown,
  DatabaseBackup,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useBixbo,
  EMPTY,
  todayKey,
  replaceBixbo,
  getBixbo,
  clearBixboLocalStorage,
  isPregnancyActive,
  isPostpartumActive,
  userAllergens,
  type BixboData,
  type PartnerData,
  type Gender,
} from "@/lib/storage";
import { mergeBixbo } from "@/lib/merge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useSession,
  ensureProfile,
  updateProfile,
  linkPartnerByCode,
  unlinkPartner,
  fetchPartner,
  pullMyData,
  type CloudProfile,
} from "@/lib/cloudSync";
import { SCALE_META, type ScaleKey } from "@/lib/scaleDescriptions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BIXBO" },
      { name: "description", content: "Preferences, cloud sync, and couple sharing for BIXBO." },
      { property: "og:title", content: "Settings — BIXBO" },
      { property: "og:description", content: "Preferences, cloud sync, and couple sharing." },
    ],
  }),
  component: SettingsPage,
});

/* ------------------------------------------------------------------ */
/* Shared category / row primitives — keeps every section visually    */
/* identical: same card, heading size, row height, spacing, dividers. */
/* ------------------------------------------------------------------ */

function Category({
  id,
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-surface ring-1 ring-border">
      <button
        id={`cat-${id}-trigger`}
        aria-expanded={open}
        aria-controls={`cat-${id}-panel`}
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={`cat-${id}-panel`}
          role="region"
          aria-labelledby={`cat-${id}-trigger`}
          className="space-y-4 border-t border-border px-4 pb-4 pt-4"
        >
          {children}
        </div>
      )}
    </section>
  );
}

/** A single settings row with consistent min-height / divider treatment. */
function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-[44px] border-b border-border/60 py-2.5 last:border-b-0 ${className}`}>{children}</div>;
}

function SubHeading({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

const CATEGORY_ORDER = [
  "general",
  "appearance",
  "health",
  "cycle",
  "pregnancy",
  "notifications",
  "privacy",
  "export",
  "backup",
  "developer",
] as const;
type CategoryId = (typeof CATEGORY_ORDER)[number];

function SettingsPage() {
  const navigate = useNavigate();
  const { data, update, replace, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const { session, ready } = useSession();
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<CategoryId, boolean>>({
    general: true,
    appearance: false,
    health: false,
    cycle: false,
    pregnancy: false,
    notifications: false,
    privacy: false,
    export: false,
    backup: false,
    developer: false,
  });
  const toggle = (id: CategoryId) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const doRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const remote = await pullMyData();
      if (remote) replaceBixbo({ ...getBixbo(), ...remote, partner: getBixbo().partner }, "remote");
      const p = await fetchPartner();
      if (p) update((d) => ({ ...d, partner: p }));
      else if (session) update((d) => ({ ...d, partner: undefined }));
      setRefreshMsg(`Synced ✓ ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPerm("unsupported");
      return;
    }
    setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      setProfile(null);
      return;
    }
    ensureProfile(view.settings.partnerName || undefined).then((p) => setProfile(p));
  }, [ready, session?.user?.id]);

  const setSize = (s: "sm" | "md" | "lg" | "xl") => update((d) => ({ ...d, settings: { ...d.settings, textSize: s } }));

  const setGender = (g: Gender) => {
    update((d) => ({ ...d, settings: { ...d.settings, gender: g } }));
    if (session) updateProfile({ gender: g });
  };

  const setTheme = (t: "light" | "dark" | "system") => update((d) => ({ ...d, settings: { ...d.settings, theme: t } }));

  const toggleNotif = (on: boolean) => {
    update((d) => ({ ...d, settings: { ...d.settings, notifications: on } }));
    if (on && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPerm);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bixbo-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try {
      const incoming = { ...EMPTY, ...JSON.parse(await file.text()) } as BixboData;
      if (
        !window.confirm(
          "Import backup?\n\nYour current data is kept — anything from the file that you don't already have is added. Nothing is deleted.",
        )
      )
        return;
      // Deep union merge (same logic as cloud sync) — never overwrites existing entries.
      replace(mergeBixbo(getBixbo(), incoming));
      alert("Imported — your data was merged, nothing was deleted.");
    } catch {
      alert("Could not read that file.");
    }
  };

  const importPartner = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as BixboData;
      const dayLogs: PartnerData["dayLogs"] = {};
      for (const [k, l] of Object.entries(raw.dayLogs ?? {})) {
        if (l.pain?.length || l.panic?.length) dayLogs[k] = { pain: l.pain, panic: l.panic };
      }
      const partner: PartnerData = { name: raw.settings?.partnerName || "Partner", dayLogs, importedAt: Date.now() };
      update((d) => ({ ...d, partner }));
      alert("Partner data imported.");
    } catch {
      alert("Could not read that file.");
    }
  };

  const clearPartner = () => update((d) => ({ ...d, partner: undefined }));

  const doLinkPartner = async () => {
    if (!partnerCode.trim()) return;
    setPartnerBusy(true);
    setPartnerMsg(null);
    try {
      const p = await linkPartnerByCode(partnerCode);
      setPartnerMsg(`Linked with ${p.display_name || "your partner"} ✓`);
      setPartnerCode("");
      // Trigger immediate partner fetch
      const pd = await fetchPartner();
      if (pd) update((d) => ({ ...d, partner: pd }));
    } catch (err) {
      setPartnerMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setPartnerBusy(false);
    }
  };

  const doUnlink = async () => {
    setPartnerBusy(true);
    try {
      await unlinkPartner();
      update((d) => ({ ...d, partner: undefined }));
      setPartnerMsg("Unlinked.");
    } finally {
      setPartnerBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const copyCode = () => {
    if (!profile) return;
    navigator.clipboard?.writeText(profile.pairing_code);
  };

  const setCycle = (patch: Partial<BixboData["cycle"]>) => update((d) => ({ ...d, cycle: { ...d.cycle, ...patch } }));

  const setPregnancyActive = (active: boolean) =>
    update((d) => ({
      ...d,
      pregnancy: {
        ...(d.pregnancy ?? EMPTY.pregnancy!),
        active,
        endedAt: active ? undefined : d.pregnancy?.endedAt,
      },
      postpartum: active
        ? {
            ...(d.postpartum ?? EMPTY.postpartum!),
            active: false,
          }
        : d.postpartum,
      settings: {
        ...d.settings,
        pregnantSince: undefined,
      },
    }));

  const setPostpartumActive = (active: boolean) =>
    update((d) => ({
      ...d,
      pregnancy: active
        ? {
            ...(d.pregnancy ?? EMPTY.pregnancy!),
            active: false,
            endedAt: d.pregnancy?.endedAt ?? todayKey(),
          }
        : d.pregnancy,
      postpartum: {
        ...(d.postpartum ?? EMPTY.postpartum!),
        active,
        birthDate: active ? (d.postpartum?.birthDate ?? todayKey()) : d.postpartum?.birthDate,
      },
      settings: {
        ...d.settings,
        pregnantSince: undefined,
      },
    }));

  const babyIsBorn = () => {
    if (
      !window.confirm(
        "Switch to postpartum mode now? This ends pregnancy tracking and starts postpartum tracking with today as the birth date.",
      )
    )
      return;
    const today = todayKey();
    update((d) => ({
      ...d,
      pregnancy: { ...(d.pregnancy ?? EMPTY.pregnancy!), active: false, endedAt: today },
      postpartum: { ...(d.postpartum ?? EMPTY.postpartum!), active: true, birthDate: d.postpartum?.birthDate ?? today },
    }));
  };

  const resetLocalCache = () => {
    if (
      !window.confirm(
        "Reset local cache?\n\nThis clears locally cached data on this device only. If you are signed in, your cloud data is unaffected and will re-sync.",
      )
    )
      return;
    try {
      const keep = session ? getBixbo() : null;
      clearBixboLocalStorage();
      if (keep) replaceBixbo(keep, "remote");
      alert("Local cache reset.");
    } catch {
      alert("Could not reset local cache.");
    }
  };

  const TEXT_SIZES: { v: "sm" | "md" | "lg" | "xl"; label: string; px: string }[] = [
    { v: "sm", label: "Small", px: "14" },
    { v: "md", label: "Medium", px: "16" },
    { v: "lg", label: "Large", px: "18" },
    { v: "xl", label: "XL", px: "20" },
  ];

  const pregnancyActive = isPregnancyActive(view);
  const postpartumActive = isPostpartumActive(view);

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Settings
        </button>
      }
    >
      <div className="space-y-3 px-5 pt-4 pb-24">
        {/* ==================== GENERAL ==================== */}
        <Category
          id="general"
          icon={<User className="h-4 w-4" />}
          title="General"
          subtitle="Name, greeting and mode"
          open={open.general}
          onToggle={() => toggle("general")}
        >
          <Row>
            <label htmlFor="settings-username" className="text-sm font-medium">
              Your name
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">Used for the "Hi, ..." greeting on Home.</p>
            <Input
              id="settings-username"
              className="mt-2"
              value={view.settings.userName ?? ""}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, userName: e.target.value } }))}
              placeholder="there"
            />
          </Row>
          <Row>
            <p className="text-sm font-medium">Mode</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Male mode hides Blueberry cycle tracking everywhere.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["female", "male"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`min-h-[44px] rounded-xl border p-3 text-sm font-medium capitalize ${(view.settings.gender ?? "female") === g ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
                >
                  {g === "female" ? "👩 Female" : "👨 Male"}
                </button>
              ))}
            </div>
          </Row>
          <Row className="border-b-0">
            <p className="text-sm font-medium">
              <Pill className="mr-1 inline h-4 w-4" /> Medications
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Manage your medication list and daily schedule.</p>
            <Link
              to="/meds"
              className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              <Pill className="h-3.5 w-3.5" /> Manage pills
            </Link>
          </Row>
        </Category>

        {/* ==================== APPEARANCE ==================== */}
        <Category
          id="appearance"
          icon={<Palette className="h-4 w-4" />}
          title="Appearance"
          subtitle="Theme and text size"
          open={open.appearance}
          onToggle={() => toggle("appearance")}
        >
          <Row>
            <p className="text-sm font-medium">Theme</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose how BIXBO looks on this device.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { v: "light", label: "Light", Icon: Sun },
                  { v: "dark", label: "Dark", Icon: Moon },
                  { v: "system", label: "System", Icon: MonitorSmartphone },
                ] as { v: "light" | "dark" | "system"; label: string; Icon: typeof Sun }[]
              ).map(({ v, label, Icon }) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  aria-label={`Theme: ${label}`}
                  className={`flex min-h-[44px] flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium ${(view.settings.theme ?? "system") === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row className="border-b-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              <Type className="mr-1 inline h-3 w-3" /> Text size
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {TEXT_SIZES.map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSize(s.v)}
                  aria-label={`Text size: ${s.label}`}
                  className={`min-h-[44px] rounded-xl border p-2 text-center transition ${view.settings.textSize === s.v ? "border-primary bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground" : "border-border bg-tint"}`}
                >
                  <span style={{ fontSize: `${s.px}px` }}>Aa</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </Row>
        </Category>

        {/* ==================== HEALTH ==================== */}
        <Category
          id="health"
          icon={<HeartPulse className="h-4 w-4" />}
          title="Health"
          subtitle="Allergens, quick log and scales"
          open={open.health}
          onToggle={() => toggle("health")}
        >
          <AllergensInline view={view} update={update} />
          <ScaleInline view={view} update={update} />
        </Category>

        {/* ==================== CYCLE ==================== */}
        <Category
          id="cycle"
          icon={<CalendarClock className="h-4 w-4" />}
          title="Cycle"
          subtitle="Cycle length, period dates, birth control"
          open={open.cycle}
          onToggle={() => toggle("cycle")}
        >
          {pregnancyActive || postpartumActive ? (
            <Row className="border-b-0">
              <p className="text-xs text-muted-foreground">
                Cycle predictions are hidden while pregnancy or postpartum mode is active. You can still edit the
                underlying dates below.
              </p>
            </Row>
          ) : null}
          <Row>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cycle-length" className="text-xs font-medium text-muted-foreground">
                  Cycle length (days)
                </label>
                <Input
                  id="cycle-length"
                  type="number"
                  min={15}
                  max={60}
                  className="mt-1"
                  value={view.cycle.cycleLength}
                  onChange={(e) => setCycle({ cycleLength: Math.max(1, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <label htmlFor="period-length" className="text-xs font-medium text-muted-foreground">
                  Period length (days)
                </label>
                <Input
                  id="period-length"
                  type="number"
                  min={1}
                  max={15}
                  className="mt-1"
                  value={view.cycle.periodLength}
                  onChange={(e) => setCycle({ periodLength: Math.max(1, Number(e.target.value) || 0) })}
                />
              </div>
            </div>
          </Row>
          <Row>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="last-period-start" className="text-xs font-medium text-muted-foreground">
                  Last period start
                </label>
                <Input
                  id="last-period-start"
                  type="date"
                  className="mt-1"
                  value={view.cycle.lastPeriodStart ?? ""}
                  onChange={(e) => setCycle({ lastPeriodStart: e.target.value || undefined })}
                />
              </div>
              <div>
                <label htmlFor="last-period-end" className="text-xs font-medium text-muted-foreground">
                  Last period end
                </label>
                <Input
                  id="last-period-end"
                  type="date"
                  className="mt-1"
                  value={view.cycle.lastPeriodEnd ?? ""}
                  onChange={(e) => setCycle({ lastPeriodEnd: e.target.value || undefined })}
                />
              </div>
            </div>
          </Row>
          <Row className="border-b-0">
            <label htmlFor="birth-control-since" className="text-sm font-medium">
              Birth control since
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">Used to count pill days continuously.</p>
            <Input
              id="birth-control-since"
              type="date"
              className="mt-2"
              value={view.settings.birthControlSince ?? ""}
              onChange={(e) =>
                update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))
              }
            />
            {view.settings.birthControlSince && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Taking birth control since {view.settings.birthControlSince}
              </p>
            )}
          </Row>
        </Category>

        {/* ==================== PREGNANCY ==================== */}
        <Category
          id="pregnancy"
          icon={<Baby className="h-4 w-4" />}
          title="Pregnancy"
          subtitle="Pregnancy & postpartum modes"
          open={open.pregnancy}
          onToggle={() => toggle("pregnancy")}
        >
          <Row>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Pregnancy mode</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Hides period, ovulation and fertility predictions while active.
                </p>
              </div>
              <Switch
                checked={pregnancyActive}
                onCheckedChange={setPregnancyActive}
                aria-label="Toggle pregnancy mode"
              />
            </div>
            {pregnancyActive && (
              <Link
                to={"/pregnancy" as never}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open pregnancy dashboard
              </Link>
            )}
          </Row>
          <Row>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Postpartum mode</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Track recovery, feeding and baby sleep after birth.
                </p>
              </div>
              <Switch
                checked={postpartumActive}
                onCheckedChange={setPostpartumActive}
                aria-label="Toggle postpartum mode"
              />
            </div>
            {postpartumActive && (
              <Link
                to={"/postpartum" as never}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open postpartum dashboard
              </Link>
            )}
          </Row>
          {pregnancyActive && !postpartumActive && (
            <Row className="border-b-0">
              <p className="text-sm font-medium">Baby is born</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ends pregnancy tracking and switches to postpartum mode, starting today.
              </p>
              <Button size="sm" className="mt-2" onClick={babyIsBorn}>
                <Baby className="h-3.5 w-3.5" /> Baby is born — switch to postpartum
              </Button>
            </Row>
          )}
        </Category>

        {/* ==================== NOTIFICATIONS ==================== */}
        <Category
          id="notifications"
          icon={<Bell className="h-4 w-4" />}
          title="Notifications"
          subtitle="Reminders for meds and periods"
          open={open.notifications}
          onToggle={() => toggle("notifications")}
        >
          <Row className="border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Reminders for meds and predicted period.</p>
              </div>
              <Switch
                checked={view.settings.notifications && notifPerm === "granted"}
                onCheckedChange={toggleNotif}
                aria-label="Toggle notifications"
              />
            </div>
            {notifPerm === "unsupported" && (
              <p className="mt-2 text-xs text-destructive">Not supported in this browser.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Manage individual medication reminder times from Medications above.
            </p>
          </Row>
        </Category>

        {/* ==================== PRIVACY ==================== */}
        <Category
          id="privacy"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Privacy"
          subtitle="Partner pairing and sharing"
          open={open.privacy}
          onToggle={() => toggle("privacy")}
        >
          <Row>
            <p className="text-sm font-medium">
              <Cloud className="mr-1 inline h-4 w-4" /> Cloud account
            </p>
            {!session ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in to sync BIXBO across all your devices and share with your partner using a code — no imports
                  needed.
                </p>
                <Link
                  to="/auth"
                  className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Sign in / Create account
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">Signed in as {session.user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    readOnly
                    value={profile?.pairing_code ?? "…"}
                    className="font-mono text-lg tracking-widest"
                    aria-label="Your pairing code"
                  />
                  <Button size="sm" variant="outline" onClick={copyCode} aria-label="Copy pairing code">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Share this pairing code with your partner. They enter it below to link accounts.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={signOut}>
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </Button>
                </div>
              </>
            )}
          </Row>
          <Row className="border-b-0">
            <p className="text-sm font-medium">
              <Users className="mr-1 inline h-4 w-4" /> Couple sharing
            </p>
            {session ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your partner's pairing code. Once linked, both of you can see each other's pain and panic-attack
                  entries in the{" "}
                  <Link to="/couple" className="underline">
                    Couple
                  </Link>{" "}
                  tab — updates appear automatically.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    placeholder="Partner code (e.g. AB2C7X)"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest"
                    aria-label="Partner pairing code"
                  />
                  <Button size="sm" onClick={doLinkPartner} disabled={partnerBusy || !partnerCode}>
                    Link
                  </Button>
                </div>
                {view.partner && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Linked with <b>{view.partner.name}</b> · {Object.keys(view.partner.dayLogs).length} days synced
                    </span>
                    <Button size="sm" variant="outline" onClick={doUnlink} disabled={partnerBusy}>
                      Unlink
                    </Button>
                  </div>
                )}
                {partnerMsg && <p className="mt-2 text-xs">{partnerMsg}</p>}
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Sign in above to use cloud partner sharing.</p>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Import partner from JSON (offline)
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importPartner(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                    <Upload className="h-3.5 w-3.5" /> Import partner data
                  </span>
                </label>
                {view.partner && !session && (
                  <Button size="sm" variant="outline" onClick={clearPartner}>
                    Clear
                  </Button>
                )}
              </div>
            </details>
          </Row>
        </Category>

        {/* ==================== EXPORT ==================== */}
        <Category
          id="export"
          icon={<FileDown className="h-4 w-4" />}
          title="Export"
          subtitle="Download or share your data"
          open={open.export}
          onToggle={() => toggle("export")}
        >
          <Row className="border-b-0">
            <p className="text-sm font-medium">Export data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Download a full JSON copy of everything you've logged.
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={exportJson}>
                <Download className="h-3.5 w-3.5" /> Export JSON
              </Button>
            </div>
          </Row>
        </Category>

        {/* ==================== BACKUP ==================== */}
        <Category
          id="backup"
          icon={<DatabaseBackup className="h-4 w-4" />}
          title="Backup"
          subtitle="Import, merge and cloud sync"
          open={open.backup}
          onToggle={() => toggle("backup")}
        >
          <Row>
            <p className="text-sm font-medium">Backup & restore</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session
                ? "Your data auto-syncs to the cloud. You can still import a JSON copy to merge in extra data."
                : "Data is stored on this device. Import a JSON backup to merge data."}
            </p>
            <div className="mt-2 flex gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJson(f);
                    e.currentTarget.value = "";
                  }}
                />
                <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> Import (merge)
                </span>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Import always merges — nothing you already have is ever deleted or replaced.
            </p>
          </Row>
          <Row className="border-b-0">
            <p className="text-sm font-medium">Cloud sync</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {session
                ? "Manually pull the latest data from the cloud."
                : "Sign in under Privacy to enable cloud sync."}
            </p>
            {session && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={doRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh sync
                </Button>
                {refreshMsg && <span className="text-[11px] text-muted-foreground">{refreshMsg}</span>}
              </div>
            )}
          </Row>
        </Category>

        {/* ==================== DEVELOPER ==================== */}
        <Category
          id="developer"
          icon={<Wrench className="h-4 w-4" />}
          title="Developer"
          subtitle="App info & diagnostics"
          open={open.developer}
          onToggle={() => toggle("developer")}
        >
          <Row>
            <p className="text-sm font-medium">App version</p>
            <p className="mt-0.5 text-xs text-muted-foreground">BIXBO web build.</p>
          </Row>
          <Row className="border-b-0">
            <p className="text-sm font-medium">Reset local cache</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Clears locally cached data on this device. Cloud data (if signed in) is unaffected.
            </p>
            <Button size="sm" variant="destructive" className="mt-2" onClick={resetLocalCache}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset local cache
            </Button>
          </Row>
        </Category>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Health-category sub-editors                                        */
/* ------------------------------------------------------------------ */

function AllergensInline({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const [text, setText] = useState("");
  const allergens = userAllergens(view);

  const add = () => {
    const v = text.trim();
    if (!v || allergens.some((item) => item.toLowerCase() === v.toLowerCase())) return;

    update((d) => ({
      ...d,
      profile: {
        ...(d.profile ?? {}),
        allergies: [...userAllergens(d), v],
      },
      settings: {
        ...d.settings,
        allergens: undefined,
      },
    }));

    setText("");
  };

  const remove = (a: string) =>
    update((d) => ({
      ...d,
      profile: {
        ...(d.profile ?? {}),
        allergies: userAllergens(d).filter((x) => x !== a),
      },
      settings: {
        ...d.settings,
        allergens: undefined,
      },
    }));

  return (
    <Row>
      <label htmlFor="allergen-input" className="text-sm font-medium">
        Allergens
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Saved in Health Profile and used to flag them in the Food log.
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          id="allergen-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Peanuts"
        />
        <Button size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {allergens.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allergens.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs">
              {a}
              <button
                onClick={() => remove(a)}
                aria-label={`Remove ${a}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Row>
  );
}

function QuickLogEditor({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const custom = view.settings.customQuickTags ?? [];
  const hidden = view.settings.hiddenQuickTags ?? [];

  const unhide = (key: string) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, hiddenQuickTags: (d.settings.hiddenQuickTags ?? []).filter((x) => x !== key) },
    }));

  return (
    <Row className="border-b-0">
      <p className="text-sm font-medium">
        <ListPlus className="mr-1 inline h-4 w-4" /> Quick log
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Add, reorder and hide quick-log buttons directly from the Home screen — tap "Edit" above the quick log bar.
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {custom.length} custom button{custom.length === 1 ? "" : "s"}.
      </p>
      {hidden.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">Hidden buttons</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {hidden.map((key) => (
              <button
                key={key}
                onClick={() => unhide(key)}
                className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> {key}
              </button>
            ))}
          </div>
        </div>
      )}
    </Row>
  );
}

function ScaleInline({ view, update }: { view: BixboData; update: (u: (d: BixboData) => BixboData) => void }) {
  const [openKey, setOpenKey] = useState<ScaleKey | null>(null);
  const overrides = view.settings.scaleDescriptions ?? {};

  const setLevel = (key: ScaleKey, level: number, text: string) => {
    update((d) => {
      const cur = d.settings.scaleDescriptions ?? {};
      const scale = { ...(cur[key] ?? {}) };
      const def = SCALE_META[key].defaults[level];
      if (text === def || text.trim() === "") delete scale[level];
      else scale[level] = text;
      const next = { ...cur, [key]: scale };
      if (Object.keys(scale).length === 0) delete next[key];
      return { ...d, settings: { ...d.settings, scaleDescriptions: next } };
    });
  };
  const resetScale = (key: ScaleKey) => {
    update((d) => {
      const next = { ...(d.settings.scaleDescriptions ?? {}) };
      delete next[key];
      return { ...d, settings: { ...d.settings, scaleDescriptions: next } };
    });
  };

  const keys: ScaleKey[] = ["pain", "stress", "tetany", "panic", "hotFlashes", "headache"];

  return (
    <>
      <Row>
        <p className="text-sm font-medium">
          <Sliders className="mr-1 inline h-4 w-4" /> Scale descriptions
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Personalize the wording for each level of each scale. Empty a field to restore the default.
        </p>
        <div className="mt-2 space-y-2">
          {keys.map((k) => {
            const meta = SCALE_META[k];
            const isOpen = openKey === k;
            const customCount = Object.keys(overrides[k] ?? {}).length;
            return (
              <div key={k} className="rounded-2xl border border-border bg-tint/40">
                <button
                  onClick={() => setOpenKey(isOpen ? null : k)}
                  className="flex min-h-[44px] w-full items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {customCount > 0 ? `${customCount} customized` : "defaults"} · {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-border/60 p-3">
                    {Array.from({ length: meta.to - meta.from + 1 }, (_, i) => i + meta.from).map((n) => {
                      const value = overrides[k]?.[n] ?? meta.defaults[n] ?? "";
                      const isCustom = overrides[k]?.[n] != null;
                      const span = Math.max(1, meta.to - meta.from);
                      const hue = 130 - ((n - meta.from) * 130) / span;
                      return (
                        <div key={n} className="flex gap-2">
                          <span
                            className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: `hsl(${hue} 70% 50%)` }}
                          >
                            {n}
                          </span>
                          <Textarea
                            rows={2}
                            value={value}
                            aria-label={`${meta.label} level ${n} description`}
                            onChange={(e) => setLevel(k, n, e.target.value)}
                            className={`min-h-0 text-xs ${isCustom ? "ring-1 ring-primary/40" : ""}`}
                          />
                        </div>
                      );
                    })}
                    {customCount > 0 && (
                      <Button size="sm" variant="outline" onClick={() => resetScale(k)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reset {meta.label} to defaults
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Row>
      <QuickLogEditor view={view} update={update} />
    </>
  );
}
