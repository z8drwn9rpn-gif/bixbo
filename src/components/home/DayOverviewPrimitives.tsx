import { useState, type ReactNode } from "react";
import { Trash2, Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";

export function DayOverviewDeleteButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-base font-bold leading-none text-muted-foreground transition hover:bg-tint hover:text-foreground"
        aria-label={t("More options")}
        aria-expanded={open}
      >
        ⋯
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label={t("Close")}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <span className="absolute right-0 top-8 z-50 block w-[132px] overflow-hidden rounded-2xl border border-border/70 bg-background p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className="flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t("Delete")}</span>
            </button>
          </span>
        </>
      ) : null}
    </span>
  );
}

export function DayOverviewCard({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const resolvedIcon = icon === "🫯" ? "✨" : icon;
  const foodValueAlignment =
    title === "Food"
      ? "[&_li>button>div+p]:flex [&_li>button>div+p]:min-w-0 [&_li>button>div+p]:items-start [&_li>button>div+p]:gap-1 [&_li>button>div+p>span:first-child]:shrink-0 [&_li>button>div+p>svg]:shrink-0 [&_li>button>div+p>span:last-child]:min-w-0 [&_li>button>div+p>span:last-child]:flex-1"
      : "";
  return (
    <div
      data-bixbo-day-overview-card={title.toLowerCase()}
      className={`rounded-3xl border border-border/70 bg-surface shadow-sm ring-1 ring-border ${compact ? "px-4 py-3" : "p-4"} ${foodValueAlignment}`}
    >
      <div className={`${compact ? "mb-1" : "mb-2"} flex items-center gap-2`}>
        <Ico e={resolvedIcon} size={22} />
        <h3 className="font-serif text-lg font-semibold">{t(title)}</h3>
      </div>
      {children}
    </div>
  );
}
