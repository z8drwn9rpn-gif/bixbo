import type { ReactNode } from "react";
import { Trash2, Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";

export function DayOverviewDeleteButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label={t("Delete")}>
      <Trash2 className="h-3.5 w-3.5" />
    </button>
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
  return (
    <div className={`rounded-3xl border border-border/70 bg-surface shadow-sm ring-1 ring-border ${compact ? "px-4 py-3" : "p-4"}`}>
      <div className={`${compact ? "mb-1" : "mb-2"} flex items-center gap-2`}>
        <Ico e={icon} size={22} />
        <h3 className="font-serif text-lg font-semibold">{t(title)}</h3>
      </div>
      {children}
    </div>
  );
}
