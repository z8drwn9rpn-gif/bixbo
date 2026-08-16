import { useEffect, useState } from "react";
import { LogSheet } from "@/components/LogSheet";
import {
  BoltIcon,
  FlameIcon,
  PanicIcon,
  PillIcon,
  SparkleIcon,
} from "@/components/icons/BixboExtraIcons";
import { todayKey, useBixbo } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";

type QuickCategory = "pain" | "symptoms" | "meds" | "panic" | "tetany";

const ACTIONS: Array<{
  id: QuickCategory;
  label: string;
  initial: string;
  icon: typeof FlameIcon;
}> = [
  { id: "pain", label: "Pain", initial: "pain", icon: FlameIcon },
  { id: "symptoms", label: "Add symptoms", initial: "pain", icon: SparkleIcon },
  { id: "meds", label: "Meds", initial: "meds", icon: PillIcon },
  { id: "panic", label: "Panic", initial: "panic", icon: PanicIcon },
  { id: "tetany", label: "Tetany", initial: "tetany", icon: BoltIcon },
];

export function GlobalQuickLogActions() {
  const { t } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [initial, setInitial] = useState<string | undefined>();

  useEffect(() => {
    const openMenu = () => setMenuOpen(true);
    const openDirect = (event: Event) => {
      const detail = (event as CustomEvent<{ category?: string }>).detail;
      setInitial(detail?.category || undefined);
      setMenuOpen(false);
      setLogOpen(true);
    };
    window.addEventListener("bixbo:open-quick-log-menu", openMenu);
    window.addEventListener("bixbo:open-quick-log", openDirect);
    return () => {
      window.removeEventListener("bixbo:open-quick-log-menu", openMenu);
      window.removeEventListener("bixbo:open-quick-log", openDirect);
    };
  }, []);

  const openCategory = (category: QuickCategory, initialCategory: string) => {
    // "Add symptoms" intentionally enters Pain, where the existing Add symptoms
    // flow remains the single source of truth for linking symptom updates.
    setInitial(initialCategory);
    setMenuOpen(false);
    setLogOpen(true);
  };

  return (
    <>
      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label={t("Close")}
            className="fixed inset-0 z-[58] bg-black/10 backdrop-blur-[1px]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed bottom-[calc(6.9rem+env(safe-area-inset-bottom))] left-1/2 z-[59] w-[min(350px,calc(100vw-28px))] -translate-x-1/2 rounded-[1.5rem] border border-border/70 bg-background/96 p-2.5 shadow-2xl backdrop-blur-xl lg:bottom-6"
            role="dialog"
            aria-label={t("Quick log")}
          >
            <div className="grid grid-cols-5 gap-1.5">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => openCategory(action.id, action.initial)}
                    className="flex min-w-0 flex-col items-center gap-1 rounded-2xl bg-tint px-1 py-2 text-[10px] font-semibold text-foreground ring-1 ring-border/45 transition active:scale-95"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-primary shadow-sm">
                      <Icon size={19} />
                    </span>
                    <span className="max-w-full truncate">{t(action.label)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[9px] text-muted-foreground">
              {t("Hold + Log anytime to open these shortcuts.")}
            </p>
          </div>
        </>
      ) : null}

      {hydrated ? (
        <LogSheet
          open={logOpen}
          onOpenChange={(open) => {
            setLogOpen(open);
            if (!open) setInitial(undefined);
          }}
          date={todayKey()}
          data={data}
          update={update}
          initial={initial as never}
        />
      ) : null}
    </>
  );
}
