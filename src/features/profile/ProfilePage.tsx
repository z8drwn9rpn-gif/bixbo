import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { resyncAppFromCloud } from "@/lib/manualCloudResync";
import { useProfilePageModel } from "./useProfilePageModel";
import { ProfilePageSpecialViews } from "./ProfilePageSpecialViews";

const HUB_ACTION_CLASS =
  "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full border border-border bg-background px-2.5 text-[11px] font-extrabold text-foreground shadow-md transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60";
const HUB_PRIMARY_ACTION_CLASS = `${HUB_ACTION_CLASS} border-primary bg-primary text-primary-foreground visited:text-primary-foreground hover:bg-primary/90`;

type ResyncState = "idle" | "syncing" | "synced" | "error";

export function ProfilePage() {
  const model = useProfilePageModel();
  const [resyncState, setResyncState] = useState<ResyncState>("idle");
  const [resyncMessage, setResyncMessage] = useState("");

  const runResync = async () => {
    if (resyncState === "syncing") return;
    setResyncState("syncing");
    setResyncMessage("Resyncing BIXBO with the cloud…");

    try {
      const result = await resyncAppFromCloud();
      setResyncState("synced");
      setResyncMessage(
        result.partnerFound
          ? "Resync complete. Partner data refreshed."
          : "Resync complete. No linked partner data was returned.",
      );
      window.setTimeout(() => setResyncState("idle"), 2_000);
    } catch (error) {
      setResyncState("error");
      setResyncMessage(error instanceof Error ? error.message : "Resync failed.");
      window.setTimeout(() => setResyncState("idle"), 3_000);
    }
  };

  const resyncLabel =
    resyncState === "syncing"
      ? "Syncing…"
      : resyncState === "synced"
        ? "Synced"
        : resyncState === "error"
          ? "Retry sync"
          : "Resync app";

  return (
    <div className="relative">
      <ProfilePageSpecialViews model={model} />
      {model.healthView === "hub" ? (
        <>
          <div
            className="fixed right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center justify-end gap-1.5 lg:right-8"
            style={{
              top: "calc(max(0.65rem, env(safe-area-inset-top)) + 2.75rem)",
              WebkitBackdropFilter: "none",
              backdropFilter: "none",
              filter: "none",
              isolation: "isolate",
            }}
          >
            <Link to="/meds" aria-label="Manage meds" className={HUB_PRIMARY_ACTION_CLASS}>
              Manage meds
            </Link>
            <button
              type="button"
              aria-label="Resync app"
              aria-busy={resyncState === "syncing"}
              disabled={resyncState === "syncing"}
              onClick={() => void runResync()}
              className={HUB_ACTION_CLASS}
            >
              {resyncLabel}
            </button>
            <Link to="/diagnostics" aria-label="App diagnostics" className={HUB_ACTION_CLASS}>
              App scan
            </Link>
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {resyncMessage}
          </p>
        </>
      ) : null}
    </div>
  );
}
