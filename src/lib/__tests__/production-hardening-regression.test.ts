import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const appShellCss = readFileSync("src/app-shell.css", "utf8");
const hardeningCss = readFileSync("src/production-hardening.css", "utf8");
const logSheet = readFileSync("src/components/LogSheet.tsx", "utf8");
const button = readFileSync("src/components/ui/button.tsx", "utf8");
const dialog = readFileSync("src/components/ui/dialog.tsx", "utf8");
const sheet = readFileSync("src/components/ui/sheet.tsx", "utf8");
const meds = readFileSync("src/routes/meds.tsx", "utf8");

describe("production hardening contracts", () => {
  it("batches LogSheet structural observation and never observes typed character data", () => {
    expect(logSheet).toContain("window.requestAnimationFrame");
    expect(logSheet).toContain("observer.observe(document.body, { childList: true, subtree: true })");
    expect(logSheet).not.toContain("characterData: true");
    expect(logSheet).toContain("window.cancelAnimationFrame(frame)");
  });

  it("shields fast repeated Back/Next/Save actions from double activation and click-through", () => {
    expect(logSheet).toContain("const LOG_ACTION_SHIELD_MS = 250");
    expect(logSheet).toContain("lastActionButton");
    expect(logSheet).toContain("shieldUntil");
    expect(logSheet).toContain("event.stopImmediatePropagation()");
    expect(logSheet).toContain('document.addEventListener("click", onClickCapture, true)');
    expect(logSheet).toContain("[data-bixbo-log-save-bar]");
    expect(logSheet).toContain('[data-bixbo-log-surface="pain"] > div > div.sticky');
  });

  it("makes shared icon buttons touch-sized and ordinary Button instances non-submit by default", () => {
    expect(button).toContain('icon: "h-11 w-11"');
    expect(button).toContain('type: type ?? "button"');
    expect(button).toContain("touch-manipulation");
    expect(button).toContain("focus-visible:ring-2");
  });

  it("makes portal close controls full touch targets", () => {
    expect(dialog).toContain("grid h-11 w-11 place-items-center rounded-full");
    expect(sheet).toContain("grid h-11 w-11 place-items-center rounded-full");
  });

  it("keeps medication deletion intentional and medication schedules valid", () => {
    expect(meds).toContain("window.confirm(message)");
    expect(meds).toContain("Historical logs will stay in your diary");
    expect(meds).toContain("Array.from(new Set(times.map");
    expect(meds).toContain("normalizedTimes.length > 0");
    expect(meds).toContain('aria-haspopup="menu"');
    expect(meds).toContain('role="menuitem"');
    expect(meds).toContain('aria-label={t("As needed")}');
    expect(meds).toContain("disabled={!canSave}");
    expect(meds).toContain("Remove time");
    expect(meds).toContain("<div key={i} className=\"flex gap-2\">");
  });

  it("loads touch/focus/reduced-motion hardening without globally resizing every button", () => {
    expect(appShellCss).toContain('@import "./production-hardening.css";');
    expect(hardeningCss).toContain("@media (pointer: coarse)");
    expect(hardeningCss).toContain("min-width: 44px");
    expect(hardeningCss).toContain("min-height: 44px");
    expect(hardeningCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(hardeningCss).toContain("animation-duration: 0.01ms !important");
    expect(hardeningCss).toContain(":focus-visible");
    expect(hardeningCss).not.toContain("button { min-height: 44px");
  });
});
