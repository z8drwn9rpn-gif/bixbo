import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/hooks/useI18n";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";

const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";
const ADMIN_PIN_HASH = "dc4bc886825c446e6ae02d4d0c6a8787af0395079effcc3afc0f8bdc40cbd161";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isAdminSessionUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * First-use PIN gate for the inline Edit button on the Home/Calendar page.
 * It intentionally does not modify AdminEditOverlay or any app/chart logic.
 * The unlock key and PIN hash match the existing /admin Settings flow.
 */
export function AdminEditPinGate() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const pendingButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      if (window.location.pathname !== "/") return;
      if (!isAdminOwnerAccount() || isAdminSessionUnlocked()) return;

      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      if (!target || !target.closest("[data-bixbo-admin-ui]")) return;

      const text = target.textContent?.trim() ?? "";
      if (!text.includes("Edit") || text.includes("Done")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      pendingButton.current = target;
      setPin("");
      setError(false);
      setOpen(true);
    };

    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, []);

  const unlock = async () => {
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    try {
      if ((await sha256Hex(pin)) !== ADMIN_PIN_HASH) {
        setError(true);
        setPin("");
        return;
      }

      window.sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1");
      const button = pendingButton.current;
      pendingButton.current = null;
      setError(false);
      setOpen(false);
      setPin("");
      window.setTimeout(() => button?.click(), 0);
    } finally {
      setChecking(false);
    }
  };

  if (!open) return null;

  return (
    <div
      data-bixbo-admin-ui
      className="fixed inset-0 z-[120] grid place-items-center bg-black/35 px-5 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <section
        className="w-full max-w-sm rounded-[28px] bg-background p-6 text-center shadow-2xl ring-1 ring-border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-2xl">🔒</div>
        <p className="mt-4 font-serif text-xl font-bold">{t("Admin locked")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Enter the admin PIN to continue.")}</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void unlock();
          }}
          className="mt-5 h-12 w-full rounded-2xl bg-tint px-4 text-center text-lg font-bold tracking-[0.45em] ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={t("Admin PIN")}
        />
        {error ? <p className="mt-2 text-xs font-semibold text-destructive">{t("Incorrect PIN")}</p> : null}
        <button
          type="button"
          onClick={() => void unlock()}
          disabled={checking || pin.length !== 4}
          className="mt-4 h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {checking ? t("Unlocking…") : t("Unlock admin")}
        </button>
      </section>
    </div>
  );
}
