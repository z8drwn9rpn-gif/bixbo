import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Download, Upload, Users, Type } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, todayKey, type BixboData, type PartnerData } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BIXBO" },
      { name: "description", content: "Preferences, backup, and couple sharing for BIXBO." },
      { property: "og:title", content: "Settings — BIXBO" },
      { property: "og:description", content: "Preferences, backup, and couple sharing." },
    ],
  }),
  component: SettingsPage,
});

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function SettingsPage() {
  const navigate = useNavigate();
  const { data, update, replace, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) { setNotifPerm("unsupported"); return; }
    setNotifPerm(Notification.permission);
  }, []);

  const setSize = (s: "sm" | "md" | "lg" | "xl") =>
    update((d) => ({ ...d, settings: { ...d.settings, textSize: s } }));

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

  const genPair = () => update((d) => ({ ...d, settings: { ...d.settings, pairingCode: genCode() } }));

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

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium">Backup</p>
          <p className="mt-1 text-xs text-muted-foreground">Data is stored on this device. Export a JSON to move it.</p>
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

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-medium"><Users className="mr-1 inline h-4 w-4" /> Couple sharing</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate a pairing code and share your export JSON with your partner. They import it in their app under Couple.
            Live cross-device sync needs Lovable Cloud (backend).
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input readOnly value={view.settings.pairingCode ?? ""} placeholder="No code yet" />
              <Button size="sm" onClick={genPair}>Generate</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Partner's name (optional)" value={view.settings.partnerName ?? ""}
                onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, partnerName: e.target.value } }))} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input type="file" accept="application/json" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importPartner(f); e.currentTarget.value = ""; }} />
                <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> Import partner data
                </span>
              </label>
              {view.partner && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {view.partner.name} · {Object.keys(view.partner.dayLogs).length} days
                  </span>
                  <Button size="sm" variant="outline" onClick={clearPartner}>Clear</Button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
