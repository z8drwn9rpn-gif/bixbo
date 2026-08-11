from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))

# ---------------------------------------------------------------------------
# 1) Make Customize route-aware and deterministic. We keep the custom event as
#    a fallback, but prefer clicking the mounted editor's dedicated trigger.
# ---------------------------------------------------------------------------
Path("src/lib/adminCustomizeEvents.ts").write_text('''export const ADMIN_CUSTOMIZE_REQUESTED = "bixbo:admin-customize-requested";

function desiredAdminEditor(): "primary" | "couple" | "hak" | "universal" {
  if (typeof window === "undefined" || typeof document === "undefined") return "universal";
  const pathname = window.location.pathname;
  if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return "hak";
  if (pathname.startsWith("/couple")) return "couple";
  if (pathname === "/" || pathname.startsWith("/insights") || pathname.startsWith("/patterns")) return "primary";
  return "universal";
}

export function requestAdminCustomizeCurrentPage() {
  if (typeof window === "undefined") return;

  const target = desiredAdminEditor();
  const trigger = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${target}"]`);
  if (trigger) {
    trigger.click();
    return;
  }

  // Fallback for an editor that mounted between pointer-down and click.
  window.dispatchEvent(new CustomEvent(ADMIN_CUSTOMIZE_REQUESTED, { detail: { target } }));
}
''')

# Dedicated admin editor trigger attributes. Each replacement is intentionally
# scoped to the actual toggle handler used by that overlay.
for path, handler, target in [
    ("src/components/AdminEditOverlay.tsx", 'onClick={() => setOpen((value) => !value)}', "primary"),
    ("src/components/CoupleAdminEditOverlay.tsx", 'onClick={() => setOpen((value) => !value)}', "couple"),
    ("src/components/UniversalAdminPageEditor.tsx", 'onClick={() => setOpen((value) => !value)}', "universal"),
]:
    replace(path, handler, f'data-bixbo-admin-open="{target}"\n          {handler}', 1)

# HAK uses editorOpen instead of open.
replace(
    "src/components/HakAdminEditOverlay.tsx",
    'onClick={() => setEditorOpen((value) => !value)}',
    'data-bixbo-admin-open="hak"\n          onClick={() => setEditorOpen((value) => !value)}',
    1,
)

# ---------------------------------------------------------------------------
# 2) iOS Note editor focus. contentEditable remains, so rich-text behavior and
#    saved HTML stay unchanged; we only make the typing surface explicitly
#    focusable and focus it synchronously during the user's touch/pointer event.
# ---------------------------------------------------------------------------
p = "src/routes/notes-editor.tsx"
anchor = '''  const onInput = () => {
    if (!editorRef.current) return;

    contentRef.current = sanitizeNoteHtml(editorRef.current.innerHTML);

    if (editorRef.current.innerHTML !== contentRef.current) {
      editorRef.current.innerHTML = contentRef.current;
    }

    setTick((value) => value + 1);
  };
'''
insert = anchor + '''
  const focusEditorForTyping = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) {
      editor.focus({ preventScroll: true });
    }
  };
'''
replace(p, anchor, insert)
replace(
    p,
    '''            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onBlur={onInput}
            className="min-h-[40dvh] text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            data-placeholder={t("Start writing…")}
''',
    '''            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            tabIndex={0}
            inputMode="text"
            spellCheck
            onPointerDown={focusEditorForTyping}
            onTouchStart={focusEditorForTyping}
            onClick={focusEditorForTyping}
            onInput={onInput}
            onBlur={onInput}
            className="relative z-10 min-h-[40dvh] touch-manipulation select-text text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            style={{ WebkitUserSelect: "text", userSelect: "text" }}
            data-placeholder={t("Start writing…")}
''',
)

# ---------------------------------------------------------------------------
# 3) Deployment freshness. Couple's calculation is frontend code; two devices
#    can disagree when one installed PWA stays on an older asset bundle. Check
#    the no-store HTML fingerprint on focus/visibility and reload if it differs.
# ---------------------------------------------------------------------------
Path("src/lib/deploymentFreshness.ts").write_text('''import { useEffect } from "react";

function assetFingerprint(root: ParentNode): string {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((node) => node.src || node.getAttribute("src") || "")
    .filter((src) => /\\/assets\\/.+\\.js(?:\\?|$)/.test(src));
  const styles = Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
    .map((node) => node.href || node.getAttribute("href") || "")
    .filter((href) => /\\/assets\\/.+\\.css(?:\\?|$)/.test(href));
  return [...scripts, ...styles]
    .map((value) => value.replace(window.location.origin, ""))
    .sort()
    .join("|");
}

async function hasNewDeployment(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const current = assetFingerprint(document);
  if (!current) return false;

  const response = await fetch(`${window.location.origin}/?__bixbo_deploy_check=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) return false;
  const html = await response.text();
  const remoteDocument = new DOMParser().parseFromString(html, "text/html");
  const remote = assetFingerprint(remoteDocument);
  return Boolean(remote && remote !== current);
}

/** Keep long-running iOS/PWA sessions on the same frontend build across devices. */
export function useDeploymentFreshness() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    let checking = false;

    const check = async () => {
      if (cancelled || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        if (await hasNewDeployment()) {
          window.location.reload();
        }
      } catch (error) {
        console.debug("BIXBO deployment freshness check skipped", error);
      } finally {
        checking = false;
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
''')

# Mount the freshness hook once at root.
p = "src/routes/__root.tsx"
replace(p,
'import { useGlobalAdminConfigSync } from "@/lib/globalAdminConfig";\n',
'import { useGlobalAdminConfigSync } from "@/lib/globalAdminConfig";\nimport { useDeploymentFreshness } from "@/lib/deploymentFreshness";\n')
replace(p,
'''  useNotificationRuntime();
  useGlobalAdminConfigSync();
''',
'''  useNotificationRuntime();
  useGlobalAdminConfigSync();
  useDeploymentFreshness();
''')

# ---------------------------------------------------------------------------
# 4) Regression coverage for the three bug classes.
# ---------------------------------------------------------------------------
Path("src/lib/__tests__/admin-couple-notes-regression.test.ts").write_text('''import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin / Couple / Notes regressions", () => {
  it("uses route-specific direct admin editor triggers", () => {
    const events = read("src/lib/adminCustomizeEvents.ts");
    expect(events).toContain("data-bixbo-admin-open");
    expect(read("src/components/AdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="primary"');
    expect(read("src/components/CoupleAdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="couple"');
    expect(read("src/components/HakAdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="hak"');
    expect(read("src/components/UniversalAdminPageEditor.tsx")).toContain('data-bixbo-admin-open="universal"');
  });

  it("keeps Notes explicitly focusable on iOS", () => {
    const source = read("src/routes/notes-editor.tsx");
    expect(source).toContain("focusEditorForTyping");
    expect(source).toContain('role="textbox"');
    expect(source).toContain('inputMode="text"');
    expect(source).toContain("onTouchStart={focusEditorForTyping}");
  });

  it("checks for a newer deployed asset bundle", () => {
    const source = read("src/lib/deploymentFreshness.ts");
    expect(source).toContain('cache: "no-store"');
    expect(source).toContain("window.location.reload()");
    expect(read("src/routes/__root.tsx")).toContain("useDeploymentFreshness();");
  });
});
''')
