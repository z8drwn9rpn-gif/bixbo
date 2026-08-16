import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";

type InsightSection = { id: string; label: string };

function sectionId(index: number) {
  return `bixbo-insight-section-${index}`;
}

export function InsightsJumpControl({ refreshKey }: { refreshKey: string }) {
  const { t } = useI18n();
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const root = document.getElementById("bixbo-insights-content");
      if (!root) return;
      const headings = Array.from(root.querySelectorAll<HTMLElement>("h2, h3"));
      const seen = new Set<string>();
      const next: InsightSection[] = [];
      headings.forEach((heading, index) => {
        const label = heading.textContent?.trim();
        if (!label || seen.has(label.toLowerCase())) return;
        seen.add(label.toLowerCase());
        const id = heading.id || sectionId(index);
        heading.id = id;
        heading.classList.add("scroll-mt-24");
        next.push({ id, label });
      });
      setSections(next.slice(0, 30));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sections;
    return sections.filter((section) => section.label.toLowerCase().includes(normalized));
  }, [query, sections]);

  if (!sections.length) return null;

  return (
    <div className="relative lg:col-span-2" data-bixbo-insights-jump>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/70"
      >
        <span>{t("Jump to section")}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 rounded-2xl border border-border/70 bg-background/98 p-2 shadow-xl backdrop-blur-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search sections")}
            aria-label={t("Search sections")}
            className="h-9 w-full rounded-full border border-border/70 bg-surface px-3 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {filtered.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-tint active:scale-[0.99]"
              >
                {section.label}
              </button>
            ))}
            {!filtered.length ? <p className="px-3 py-3 text-center text-xs text-muted-foreground">{t("No matching sections")}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
