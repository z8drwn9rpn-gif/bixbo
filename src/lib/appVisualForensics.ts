import { recordRuntimeDiagnosticIssue } from "./appDiagnostics";

type LayoutShiftSource = {
  node?: Node | null;
  previousRect?: DOMRectReadOnly;
  currentRect?: DOMRectReadOnly;
};

type LayoutShiftWithSources = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
  sources?: LayoutShiftSource[];
};

type WindowWithVisualForensics = Window & {
  __bixboVisualForensicsV1?: boolean;
};

function compact(value: string, limit = 120): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeElementLabel(node: Node | null | undefined): string {
  if (!(node instanceof Element)) return "unknown element";
  const tag = node.tagName.toLowerCase();
  const id = node.id ? `#${compact(node.id, 40)}` : "";
  const testId = node.getAttribute("data-testid");
  const role = node.getAttribute("role");
  const aria = node.getAttribute("aria-label");
  const title = node.getAttribute("title");
  const safeName = testId || aria || title;
  return [tag, id, role ? `role=${compact(role, 30)}` : "", safeName ? `label=${compact(safeName, 60)}` : ""]
    .filter(Boolean)
    .join(" ");
}

function rectDelta(source: LayoutShiftSource): string {
  const before = source.previousRect;
  const after = source.currentRect;
  if (!before || !after) return "geometry unavailable";
  const dx = Math.round(after.x - before.x);
  const dy = Math.round(after.y - before.y);
  const dw = Math.round(after.width - before.width);
  const dh = Math.round(after.height - before.height);
  return `Δx=${dx}px Δy=${dy}px Δw=${dw}px Δh=${dh}px`;
}

function installLayoutShiftSourceForensics(): void {
  if (typeof PerformanceObserver === "undefined") return;
  const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }).supportedEntryTypes ?? [];
  if (!supported.includes("layout-shift")) return;

  const observer = new PerformanceObserver((list) => {
    if (document.visibilityState !== "visible" || window.location.pathname.startsWith("/diagnostics")) return;
    for (const raw of list.getEntries()) {
      const entry = raw as LayoutShiftWithSources;
      const value = entry.value ?? 0;
      if (entry.hadRecentInput || value < 0.12) continue;
      const sources = (entry.sources ?? []).slice(0, 4);
      const evidence = sources.length
        ? sources.map((source) => `${safeElementLabel(source.node)} (${rectDelta(source)})`).join(" · ")
        : "Browser did not expose source nodes for this layout shift.";
      recordRuntimeDiagnosticIssue(
        "jank",
        `Unexpected layout shift ${value.toFixed(3)} was traced to ${sources.length || "unknown"} visual source${sources.length === 1 ? "" : "s"}.`,
        {
          severity: value >= 0.35 ? "error" : "warning",
          context: `Visual source forensics: ${evidence}. No text-node contents or form values were captured.`,
        },
      );
    }
  });
  observer.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
}

function installTapToPaintForensics(): void {
  let lastPointerAt = 0;
  let lastPointerTarget: EventTarget | null = null;

  window.addEventListener("pointerdown", (event) => {
    if (window.location.pathname.startsWith("/diagnostics")) return;
    lastPointerAt = performance.now();
    lastPointerTarget = event.target;
  }, true);

  window.addEventListener("click", (event) => {
    if (window.location.pathname.startsWith("/diagnostics") || document.visibilityState !== "visible") return;
    const target = event.target ?? lastPointerTarget;
    const pointerAt = lastPointerAt || performance.now();
    const label = safeElementLabel(target instanceof Node ? target : null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const latency = performance.now() - pointerAt;
        if (latency < 350) return;
        recordRuntimeDiagnosticIssue(
          "interaction",
          `Tap-to-paint latency was about ${Math.round(latency)} ms after ${label}.`,
          {
            durationMs: latency,
            severity: latency >= 1_200 ? "error" : "warning",
            context: `Interaction source: ${label}. Measurement spans pointer-down to the second animation frame after click, helping distinguish a sluggish control from general background work.`,
          },
        );
      });
    });
  }, true);
}

function installVisualForensics(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const marked = window as WindowWithVisualForensics;
  if (marked.__bixboVisualForensicsV1) return;
  marked.__bixboVisualForensicsV1 = true;

  installLayoutShiftSourceForensics();
  installTapToPaintForensics();
}

installVisualForensics();

export { installVisualForensics };
