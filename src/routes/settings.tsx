import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Download, Upload, Users, Type, LogOut, Cloud, Copy, RefreshCw, Sliders, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, todayKey, replaceBixbo, getBixbo, type BixboData, type PartnerData, type Gender } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useSession, ensureProfile, updateProfile, linkPartnerByCode, unlinkPartner, fetchPartner, pullMyData,
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

  const doRefresh = async () => {
    setRefreshing(true); setRefreshMsg(null);
    try {
      const remote = await pullMyData();
      if (remote) replaceBixbo({ ...getBixbo(), ...remote, partner: getBixbo().partner }, "remote");
      const p = await fetchPartner();
      if (p) update((d) => ({ ...d, partner: p }));
      else if (session) update((d) => ({ ...d, partner: undefined }));
      setRefreshMsg(`Synced ✓ ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : String(e));
    } finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifPerm("unsupported"); return; }
    setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) { setProfile(null); return; }
    ensureProfile(view.settings.partnerName || undefined).then((p) => setProfile(p));
  }, [ready, session?.user?.id]);

  const setSize = (s: "sm" | "md" | "lg" | "xl") =>
    update((d) => ({ ...d, settings: { ...d.settings, textSize: s } }));

  const setGender = (g: Gender) => {
    update((d) => ({ ...d, settings: { ...d.settings, gender: g } }));
    if (session) updateProfile({ gender: g });
  };

  const toggleNotif = (on: boolean) => {
    update((d) => ({ ...d, settings: { ...d.settings, notifications: on } }));
    if (on && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPerm);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(view, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bixbo-backup-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try { replace({ ...EMPTY, ...JSON.parse(await file.text()) }); alert("Imported."); }
    catch { alert("Could not read that file."); }
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
    } catch { alert("Could not read that file."); }
  };

  const clearPartner = () => update((d) => ({ ...d, partner: undefined }));

  const doLinkPartner = async () => {
    if (!partnerCode.trim()) return;
    setPartnerBusy(true); setPartnerMsg(null);
    try {
      const p = await linkPartnerByCode(partnerCode);
      setPartnerMsg(`Linked with ${p.display_name || "your partner"} ✓`);
      setPartnerCode("");
      // Trigger immediate partner fetch
      const pd = await fetchPartner();
      if (pd) update((d) => ({ ...d, partner: pd }));
    } catch (err) {
      setPartnerMsg(err instanceof Error ? err.message : String(err));
    } finally { setPartnerBusy(false); }
  };

  const doUnlink = async () => {
    setPartnerBusy(true);
    try { await unlinkPartner(); update((d) => ({ ...d, partner: undefined })); setPartnerMsg("Unlinked."); }
    finally { setPartnerBusy(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };

  const copyCode = () => {
    if (!profile) return;
    navigator.clipboard?.writeText(profile.pairing_code);
  };

  const TEXT_SIZES: { v: "sm" | "md" | "lg" | "xl"; label: string; px: string }[] = [
    { v: "sm", label: "Small", px: "14" },
    { v: "md", label: "Medium", px: "16" },
    { v: "lg", label: "Large", px: "18" },
    { v: "xl", label: "XL", px: "20" },
  ];

  return (
    <AppShell
      title={
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Settings
        </button>
      }
    >
      <div className="space-y-4 px-5 pt-4 pb-24">

        {/* ---- Cloud account ---- */}
        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium"><Cloud className="mr-1 inline h-4 w-4" /> Cloud account</p>
          {!session ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Sign in to sync BIXBO across all your devices and share with your partner using a code — no imports needed.
              </p>
              <Link to="/auth" className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Sign in / Create account
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">Signed in as {session.user.email}</p>
              <div className="mt-3 flex items-center gap-2">
                <Input readOnly value={profile?.pairing_code ?? "…"} className="font-mono text-lg tracking-widest" />
                <Button size="sm" variant="outline" onClick={copyCode}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Share this pairing code with your partner. They enter it below to link accounts.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={doRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh sync
                </Button>
                <Button size="sm" variant="outline" onClick={signOut}><LogOut className="h-3.5 w-3.5" /> Sign out</Button>
              </div>
              {refreshMsg && <p className="mt-2 text-[11px] text-muted-foreground">{refreshMsg}</p>}
            </>
          )}
        </section>

        {/* ---- Gender / mode ---- */}
        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium">Mode</p>
          <p className="mt-1 text-xs text-muted-foreground">Male mode hides Blueberry cycle tracking everywhere.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["female","male"] as Gender[]).map((g) => (
              <button key={g} onClick={() => setGender(g)}
                className={`rounded-xl border p-3 text-sm font-medium capitalize ${(view.settings.gender ?? "female") === g ? "border-primary bg-primary/10 text-primary" : "border-border bg-tint"}`}>
                {g === "female" ? "👩 Female" : "👨 Male"}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground"><Type className="mr-1 inline h-3 w-3" /> Text size</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {TEXT_SIZES.map((s) => (
              <button key={s.v} onClick={() => setSize(s.v)}
                className={`rounded-xl border p-2 text-center transition ${view.settings.textSize === s.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-tint"}`}>
                <span style={{ fontSize: `${s.px}px` }}>Aa</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium"><Bell className="mr-1 inline h-4 w-4" /> Notifications</p>
              <p className="text-xs text-muted-foreground">Reminders for meds and predicted period.</p>
            </div>
            <Switch checked={view.settings.notifications && notifPerm === "granted"} onCheckedChange={toggleNotif} />
          </div>
          {notifPerm === "unsupported" && <p className="mt-2 text-xs text-destructive">Not supported in this browser.</p>}
        </section>

        {/* ---- Couple sharing ---- */}
        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium"><Users className="mr-1 inline h-4 w-4" /> Couple sharing</p>
          {session ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your partner's pairing code. Once linked, both of you can see each other's pain and panic-attack entries in the <Link to="/couple" className="underline">Couple</Link> tab — updates appear automatically.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input placeholder="Partner code (e.g. AB2C7X)" value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest" />
                <Button size="sm" onClick={doLinkPartner} disabled={partnerBusy || !partnerCode}>Link</Button>
              </div>
              {view.partner && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Linked with <b>{view.partner.name}</b> · {Object.keys(view.partner.dayLogs).length} days synced
                  </span>
                  <Button size="sm" variant="outline" onClick={doUnlink} disabled={partnerBusy}>Unlink</Button>
                </div>
              )}
              {partnerMsg && <p className="mt-2 text-xs">{partnerMsg}</p>}
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sign in above to use cloud partner sharing.</p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">Import partner from JSON (offline)</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input type="file" accept="application/json" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importPartner(f); e.currentTarget.value = ""; }} />
                <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> Import partner data
                </span>
              </label>
              {view.partner && !session && (
                <Button size="sm" variant="outline" onClick={clearPartner}>Clear</Button>
              )}
            </div>
          </details>
        </section>

        {/* ---- Scale descriptions editor ---- */}
        <ScaleEditor view={view} update={update} />



        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium">Backup</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session ? "Your data auto-syncs to the cloud. You can still export a JSON copy." : "Data is stored on this device. Export a JSON to move it."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export</Button>
            <label className="inline-flex">
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.currentTarget.value = ""; }} />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> Import
              </span>
            </label>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ScaleEditor({ view, update }: {
  view: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
}) {
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

  const keys: ScaleKey[] = ["pain", "stress", "tetany", "panic", "hotFlashes"];

  return (
    <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <p className="text-sm font-medium"><Sliders className="mr-1 inline h-4 w-4" /> Scale descriptions</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Personalize the wording for each level of each scale. Empty a field to restore the default.
      </p>
      <div className="mt-3 space-y-2">
        {keys.map((k) => {
          const meta = SCALE_META[k];
          const isOpen = openKey === k;
          const customCount = Object.keys(overrides[k] ?? {}).length;
          return (
            <div key={k} className="rounded-2xl border border-border bg-tint/40">
              <button onClick={() => setOpenKey(isOpen ? null : k)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left">
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
                        <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                              style={{ background: `hsl(${hue} 70% 50%)` }}>
                          {n}
                        </span>
                        <Textarea rows={2} value={value}
                          onChange={(e) => setLevel(k, n, e.target.value)}
                          className={`min-h-0 text-xs ${isCustom ? "ring-1 ring-primary/40" : ""}`} />
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
    </section>
  );
}

