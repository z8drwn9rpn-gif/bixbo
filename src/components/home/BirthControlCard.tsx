import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboExtraIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboExtraIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";
import { SukSukPeriodChart } from "@/components/home/SukSukPeriodChart";

export function BirthControlSummaryCard({
  data,
  dateKey,
  onOpen,
}: {
  data: BixboData;
  dateKey: string;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  if (!dateKey || String(data.settings.gender ?? "").trim().toLowerCase() === "male") return null;

  const DROVELIS_START = "2026-04-22";
  const ACTIVE_DAYS = 24;
  const PACK_DAYS = 28;
  const since = data.settings.birthControlSince || DROVELIS_START;
  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );

  // Do not show the card before HAK started unless a HAK medication is configured.
  if (dateKey < since && !bcMed) return null;

  const diff = Math.round((fromKey(dateKey).getTime() - fromKey(since).getTime()) / 86400000);
  if (diff < 0) return null;

  const packDay = (diff % PACK_DAYS) + 1;
  const isPlacebo = packDay > ACTIVE_DAYS;
  const bcId = bcMed?.id ?? "hak-default";
  const log = data.medLog[dateKey] ?? {};
  const times = data.medLogTimes?.[dateKey] ?? {};
  const takenKey = Object.keys(log).find(
    (key) => log[key] && key !== `${bcId}@missed` && key.startsWith(`${bcId}@`),
  );
  const takenTime = takenKey ? times[takenKey] ?? takenKey.split("@")[1] ?? "" : "";
  const missed = !!log[`${bcId}@missed`];

  const HAK_PURPLE = "#7A53C8";
  const HAK_PURPLE_DARK = "#5B32AE";
  const HAK_PINK = "#D95782";
  const HAK_PINK_DARK = "#B92E60";
  const HAK_PINK_SOFT = "#F7CBD9";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-5 mt-2 block w-[calc(100%-2.5rem)] rounded-2xl bg-surface px-3 py-2.5 text-left shadow-sm ring-1 ring-border transition active:scale-[0.99]"
      aria-label={`${t("Open birth control overview")} · ${t("HAK day")} ${packDay} ${t("of")} ${PACK_DAYS}`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <BlueberryIcon size={20} />
        </span>

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="truncate font-serif text-base font-bold text-foreground">{t("Birth control")}</p>
            <span className="text-[10px] text-muted-foreground">Drovelis</span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t("Day")}
              </span>
              <span className="font-serif text-lg font-bold leading-none text-primary">
                {packDay}/{PACK_DAYS}
              </span>
            </div>

            <span className="h-5 w-px bg-border/70" />

            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {isPlacebo ? t("Placebo") : t("Active")}
              </span>
              <span className="text-xs font-bold text-primary">
                {isPlacebo ? `${packDay - ACTIVE_DAYS}/4` : `${packDay}/24`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-primary"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 16%, white)",
              boxShadow: "inset 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent)",
            }}
          >
            {packDay}
          </span>
          <span className="text-lg leading-none text-primary">›</span>
        </div>
      </div>
    </button>
  );
}

export function BirthControlOverlay({
  data,
  anchor: _anchor,
  onAnchorChange: _onAnchorChange,
  onClose,
}: {
  data: BixboData;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Always open HAK detail at the very top so the title/back button are visible.
    overlayRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const mainRef = useRef<HTMLElement | null>(null);
  const fitRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  // HAK deliberately owns a local olive palette for its 3D pill/wheel design.
  // Global light/dark surfaces must not recolour those health-specific controls.
  const hakDarkMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const hakTheme = hakDarkMode
    ? {
        background: "#4B5133",
        foreground: "#F5F4E8",
        surface: "#5A6040",
        surfaceElevated: "#666D49",
        surfaceSunken: "#41472D",
        tint: "#626944",
        card: "#5A6040",
        cardForeground: "#F5F4E8",
        popover: "#626844",
        popoverForeground: "#F5F4E8",
        primary: "#B6C28E",
        primaryForeground: "#30351F",
        secondary: "#686F49",
        secondaryForeground: "#F4F2E5",
        muted: "#626847",
        mutedForeground: "#D5D7C2",
        accent: "#77805A",
        accentForeground: "#F8F7EC",
        border: "#777D58",
        input: "#777D58",
        ring: "#C0CD98",
        chartGrid: "#6C7350",
        chartAxis: "#DDDCCB",
        chartTooltipBg: "#555B3B",
        chartTooltipFg: "#F7F5E9",
      }
    : {
        background: "#98A86A",
        foreground: "#18200F",
        surface: "#B0BC89",
        surfaceElevated: "#BEC8A0",
        surfaceSunken: "#88975D",
        tint: "#A7B47B",
        card: "#B0BC89",
        cardForeground: "#18200F",
        popover: "#C3CCAA",
        popoverForeground: "#18200F",
        primary: "#5F7033",
        primaryForeground: "#FFFDF3",
        secondary: "#A9B57E",
        secondaryForeground: "#202814",
        muted: "#AAB77E",
        mutedForeground: "#475234",
        accent: "#97A969",
        accentForeground: "#1F2812",
        border: "#7D8D54",
        input: "#7D8D54",
        ring: "#5F7033",
        chartGrid: "#95A56A",
        chartAxis: "#37412B",
        chartTooltipBg: "#D0D8BC",
        chartTooltipFg: "#18200F",
      };

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const previousOverflow = body.style.overflow;

    // Save the complete inline background state. BIXBO's global light theme uses
    // a green background gradient, so changing only backgroundColor is not enough:
    // the old green background-image can remain visible in the iOS safe-area/status bar.
    const previousBodyBackground = body.style.getPropertyValue("background");
    const previousBodyBackgroundPriority = body.style.getPropertyPriority("background");
    const previousHtmlBackground = html.style.getPropertyValue("background");
    const previousHtmlBackgroundPriority = html.style.getPropertyPriority("background");
    const previousBodyThemeBackground = body.style.getPropertyValue("--background");
    const previousBodyThemeBackgroundPriority = body.style.getPropertyPriority("--background");
    const previousHtmlThemeBackground = html.style.getPropertyValue("--background");
    const previousHtmlThemeBackgroundPriority = html.style.getPropertyPriority("--background");

    let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const createdThemeMeta = !themeMeta;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    const previousThemeColor = themeMeta.content;

    body.style.overflow = "hidden";

    // Force the full document canvas — including the iOS safe area — to the same
    // lavender as Birth Control. Using the background shorthand also removes the
    // global olive gradient while this overlay is open.
    body.style.setProperty("--background", hakTheme.background, "important");
    html.style.setProperty("--background", hakTheme.background, "important");
    body.style.setProperty("background", hakTheme.background, "important");
    html.style.setProperty("background", hakTheme.background, "important");
    themeMeta.content = hakTheme.background;

    return () => {
      body.style.overflow = previousOverflow;

      if (previousBodyBackground) {
        body.style.setProperty("background", previousBodyBackground, previousBodyBackgroundPriority);
      } else {
        body.style.removeProperty("background");
      }
      if (previousHtmlBackground) {
        html.style.setProperty("background", previousHtmlBackground, previousHtmlBackgroundPriority);
      } else {
        html.style.removeProperty("background");
      }

      if (previousBodyThemeBackground) {
        body.style.setProperty("--background", previousBodyThemeBackground, previousBodyThemeBackgroundPriority);
      } else {
        body.style.removeProperty("--background");
      }
      if (previousHtmlThemeBackground) {
        html.style.setProperty("--background", previousHtmlThemeBackground, previousHtmlThemeBackgroundPriority);
      } else {
        html.style.removeProperty("--background");
      }

      if (createdThemeMeta) {
        themeMeta?.remove();
      } else if (themeMeta) {
        themeMeta.content = previousThemeColor;
      }
    };
  }, [hakTheme.background]);

  useLayoutEffect(() => {
    // HAK now scrolls naturally at full 1:1 size on both mobile and desktop.
    // Do not shrink the calendar / Current HAK pack / ŠukŠuk composition to fit.
    setFitScale(1);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-bixbo-hak-root="1"
      className="fixed inset-0 z-[900] flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
      style={{
        ...({
          "--background": hakTheme.background,
          "--foreground": hakTheme.foreground,
          "--surface": hakTheme.surface,
          "--surface-elevated": hakTheme.surfaceElevated,
          "--surface-sunken": hakTheme.surfaceSunken,
          "--tint": hakTheme.tint,
          "--card": hakTheme.card,
          "--card-foreground": hakTheme.cardForeground,
          "--popover": hakTheme.popover,
          "--popover-foreground": hakTheme.popoverForeground,
          "--primary": hakTheme.primary,
          "--primary-foreground": hakTheme.primaryForeground,
          "--secondary": hakTheme.secondary,
          "--secondary-foreground": hakTheme.secondaryForeground,
          "--muted": hakTheme.muted,
          "--muted-foreground": hakTheme.mutedForeground,
          "--accent": hakTheme.accent,
          "--accent-foreground": hakTheme.accentForeground,
          "--border": hakTheme.border,
          "--input": hakTheme.input,
          "--ring": hakTheme.ring,
          "--chart-grid": hakTheme.chartGrid,
          "--chart-axis": hakTheme.chartAxis,
          "--chart-tooltip-bg": hakTheme.chartTooltipBg,
          "--chart-tooltip-fg": hakTheme.chartTooltipFg,
        } as CSSProperties),
        background: hakTheme.background,
        backgroundColor: hakTheme.background,
      }}
    >
      {/* Explicit iOS safe-area backdrop. The document background is also forced
          purple above, so no olive strip can bleed through behind the status bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[905] bg-[#98A86A]"
        style={{
          height: "max(env(safe-area-inset-top), 1px)",
          backgroundColor: hakTheme.background,
        }}
      />

      <div className="relative z-[910] shrink-0 border-b border-border/70 bg-background px-4 pb-2 pt-[max(.65rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
            aria-label={t("Back to calendar")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-2 text-center">
            <h1 className="whitespace-nowrap font-serif text-[1.2rem] font-bold leading-tight text-foreground">
              {t("Birth control overview")}
            </h1>
            <p className="mt-1 text-[10px] leading-none text-muted-foreground">Drovelis</p>
          </div>

          <span className="h-10 w-10 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <main
        ref={mainRef}
        className="mx-auto min-h-0 w-full max-w-[42rem] flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 lg:max-w-[1180px] lg:px-6 lg:pb-24"
      >
        <div
          ref={fitRef}
          data-bixbo-hak-content="1"
          className="mx-auto w-full"
          style={{
            transform: `scale(${fitScale})`,
            transformOrigin: "top center",
          }}
        >
          <div data-bixbo-hak-custom-top="1" />
          <BirthControlCalendar data={data} darkMode={hakDarkMode} />
        </div>
      </main>
    </div>,
    document.body,
  );
}

export function BirthControlCalendar({
  data,
  darkMode,
}: {
  data: ReturnType<typeof useBixbo>["data"];
  darkMode: boolean;
}) {
  const { update } = useBixbo();
  const { t } = useI18n();
  const [sel, setSel] = useState<string | null>(null);

  // The month selector controls only the calendar inside the ring.
  // It never changes the one current 28-day HAK pack shown by the ring.
  const [hakMonth, setHakMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Personal Drovelis schedule. Keep Settings as the source of truth when present,
  // with the confirmed start date as a safe fallback for this build.
  const DROVELIS_START = "2026-04-22";
  const since = data.settings.birthControlSince || DROVELIS_START;

  useEffect(() => {
    if (!sel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sel]);

  if (String(data.settings.gender ?? "").trim().toLowerCase() === "male") return null;

  // Drovelis is monophasic: every pink active tablet has the same full dose.
  // 24 pink active tablets + 4 white placebo tablets = one 28-day pack.
  const ACTIVE_DAYS = 24;
  const PACK_DAYS = 28;

  const HAK_PURPLE = darkMode ? "#AFC17A" : "#647A32";
  const HAK_PURPLE_DARK = darkMode ? "#D9E3BA" : "#455A20";
  const HAK_PURPLE_SOFT = darkMode ? "#626944" : "#C5D1A0";
  const HAK_PURPLE_DOT = darkMode ? "#A4B76D" : "#607A2D";
  const HAK_PINK = darkMode ? "#E36F98" : "#D95782";
  const HAK_PINK_DARK = darkMode ? "#F09AB8" : "#B92E60";
  const HAK_PINK_SOFT = darkMode ? "#684653" : "#F7CBD9";
  const HAK_GREEN = darkMode ? "#A9C76F" : "#7FA33B";
  const HAK_GREEN_DARK = darkMode ? "#D4DFAA" : "#526B24";
  const HAK_GREEN_SOFT = darkMode ? "#59653C" : "#D8E4B8";
  const HAK_TRACK = darkMode ? "#747A5B" : "#E3E4C9";
  const HAK_CARD_BG = darkMode
    ? "color-mix(in srgb, var(--surface) 88%, #77805A 12%)"
    : "color-mix(in srgb, var(--background) 90%, #536A27 10%)";

  const bcMed = data.meds.find((m) =>
    /antikonc|birth\s*control|contracept|hak|pill/i.test(`${m.name} ${m.dose ?? ""}`),
  );
  const bcId = bcMed?.id ?? "hak-default";

  const todayK = toKey(new Date());

  const pillNumber = (k: string) => {
    const diff = Math.round((fromKey(k).getTime() - fromKey(since).getTime()) / 86400000);
    if (diff < 0) return null;
    return (diff % PACK_DAYS) + 1;
  };

  // One fixed 28-day HAK wheel: always the pack that contains TODAY.
  // Calendar months (28/29/30/31 days) must never move or redefine this wheel.
  const currentDay = pillNumber(todayK) ?? 1;
  const currentPackStart = addDays(todayK, -(currentDay - 1));

  const dateForPackDay = (day: number) => addDays(currentPackStart, day - 1);

  const takenAt = (k: string): string | null => {
    const log = data.medLog[k] ?? {};
    const times = data.medLogTimes?.[k] ?? {};
    const keys = Object.keys(log).filter(
      (key) => log[key] && key !== `${bcId}@missed` && key.startsWith(`${bcId}@`),
    );
    if (!keys.length) return null;
    return times[keys[0]] ?? keys[0].split("@")[1] ?? "";
  };

  const missedAt = (k: string): boolean => !!data.medLog[k]?.[`${bcId}@missed`];

  const markTaken = (k: string, time: string) =>
    update((d) => {
      const t = time || new Date().toTimeString().slice(0, 5);
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });
      day[`${bcId}@${t}`] = true;

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });
      dayTimes[`${bcId}@${t}`] = t;

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
        medNames: bcMed ? d.medNames : { ...d.medNames, [bcId]: "Birth control" },
      };
    });

  const markMissed = (k: string) =>
    update((d) => {
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });
      day[`${bcId}@missed`] = true;

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
        medNames: bcMed ? d.medNames : { ...d.medNames, [bcId]: "Birth control" },
      };
    });

  const clearRecord = (k: string) =>
    update((d) => {
      const day = { ...(d.medLog[k] ?? {}) };
      Object.keys(day).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete day[key];
      });

      const dayTimes = { ...(d.medLogTimes[k] ?? {}) };
      Object.keys(dayTimes).forEach((key) => {
        if (key.startsWith(`${bcId}@`)) delete dayTimes[key];
      });

      return {
        ...d,
        medLog: { ...d.medLog, [k]: day },
        medLogTimes: { ...d.medLogTimes, [k]: dayTimes },
      };
    });

  const selectedDay = sel ? pillNumber(sel) : null;
  const selectedTaken = sel ? takenAt(sel) : null;
  const selectedMissed = sel ? missedAt(sel) : false;
  const selectedIsPlacebo = selectedDay != null && selectedDay > ACTIVE_DAYS;
  const popupAccent = selectedIsPlacebo ? HAK_PINK_DARK : HAK_PURPLE_DARK;
  const popupSoft = selectedIsPlacebo
    ? darkMode ? "#5C3F4B" : "#F9DDE7"
    : darkMode ? "#555B3B" : "#D6DEBC";



  const fmtFullDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const fmtShortDate = (key: string) =>
    fromKey(key).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  const currentPackEnd = addDays(currentPackStart, PACK_DAYS - 1);
  const currentPlaceboStart = addDays(currentPackStart, ACTIVE_DAYS);
  const currentPlaceboEnd = addDays(currentPackStart, PACK_DAYS - 1);
  const protectionStart = addDays(since, 3);
  const protectionActive = todayK >= protectionStart;

  const wheelDays = Array.from({ length: PACK_DAYS }, (_, i) => i + 1);

  // 24 purple dots, a subtle separator, 4 pink dots, a second separator,
  // then one green dot for the next pack. This matches the detailed reference.
  const timelineItems: Array<{
    kind: "active" | "placebo" | "separator" | "next";
    day?: number;
  }> = [
    ...Array.from({ length: ACTIVE_DAYS }, (_, i) => ({ kind: "active" as const, day: i + 1 })),
    { kind: "separator" as const },
    ...Array.from({ length: PACK_DAYS - ACTIVE_DAYS }, (_, i) => ({
      kind: "placebo" as const,
      day: ACTIVE_DAYS + i + 1,
    })),
    { kind: "separator" as const },
    { kind: "next" as const, day: 1 },
  ];

  const timelineCurrentIndex =
    currentDay <= ACTIVE_DAYS
      ? currentDay - 1
      : ACTIVE_DAYS + 1 + (currentDay - ACTIVE_DAYS - 1);

  const timelineMarkerLeft = Math.max(
    6,
    Math.min(88, ((timelineCurrentIndex + 0.5) / timelineItems.length) * 100),
  );

  const hakMonthYear = hakMonth.getFullYear();
  const hakMonthIndex = hakMonth.getMonth();
  const hakMonthOffset = (new Date(hakMonthYear, hakMonthIndex, 1).getDay() + 6) % 7;
  const hakMonthCellCount = 42;
  const hakMonthCells = Array.from({ length: hakMonthCellCount }, (_, index) => {
    const dayNumber = index - hakMonthOffset + 1;
    const date = new Date(hakMonthYear, hakMonthIndex, dayNumber);
    const key = toKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === hakMonthIndex,
      packDay: pillNumber(key),
    };
  });

  const hakMonthLabel = hakMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const moveHakCalendarMonth = (delta: number) => {
    setHakMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  // TRUE mathematical 28-day ring.
  // Every adjacent bubble is the next pill number:
  // 1 → 2 → … → 24 → 25 → 26 → 27 → 28 → back to 1.
  // Rotation keeps placebo 25–28 across the bottom of the wheel.
  const WHEEL_STEP = 360 / PACK_DAYS;
  const WHEEL_DAY1_ANGLE = 57;
  const wheelAngleForDay = (day: number) =>
    WHEEL_DAY1_ANGLE - (day - 1) * WHEEL_STEP;

  return (
    <section className="flex min-h-0 flex-col">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface/65 ring-1 ring-border/50">
            <Ico e="🫐" size={25} />
          </span>
          <div className="min-w-0">
            <h2 className="whitespace-nowrap font-serif text-xl font-bold text-foreground">{t("Blueberry cycle")}</h2>
            <p className="whitespace-nowrap text-[11px] text-muted-foreground">{t("Birth control overview")}</p>
          </div>
        </div>

        <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface/30 p-0.5 ring-1 ring-border/40">
          <button
            type="button"
            onClick={() => moveHakCalendarMonth(-1)}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label={t("Previous calendar month")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="min-w-[88px] px-1 text-center text-[10px] font-semibold text-foreground">
            {hakMonthLabel}
          </span>

          <button
            type="button"
            onClick={() => moveHakCalendarMonth(1)}
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"
            aria-label={t("Next calendar month")}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Circular HAK overview — only wheel pills open the dose popup. */}
      <div className="relative left-1/2 mt-1 w-[calc(100%+2rem)] max-w-[390px] -translate-x-1/2 shrink-0">
        <div className="relative aspect-square w-full">
          <div
            className="absolute inset-[5.5%] rounded-full"
            style={{
              background: darkMode ? "rgba(102,109,73,.28)" : "rgba(255,255,255,.12)",
              boxShadow: darkMode
                ? "inset 0 0 0 9px rgba(119,125,88,.34)"
                : "inset 0 0 0 9px rgba(255,255,255,.24)",
            }}
          />
          <div
            data-bixbo-hak-wheel-center="1"
            className="absolute inset-[16.5%] rounded-full"
            style={{
              backgroundColor: HAK_CARD_BG,
              boxShadow: "0 0 0 1px rgba(255,255,255,.12)",
            }}
          />

          <div className="pointer-events-none absolute inset-0 z-[1]">
            {Array.from({ length: PACK_DAYS }).map((_, i) => {
              const day = i + 1;
              const angle = (wheelAngleForDay(day) * Math.PI) / 180;
              const radius = 44.5;
              return (
                <span
                  key={`wheel-track-${i}`}
                  className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
                  style={{
                    left: `${50 + Math.cos(angle) * radius}%`,
                    top: `${50 + Math.sin(angle) * radius}%`,
                    backgroundColor: darkMode ? "rgba(245,244,232,.42)" : "rgba(255,255,255,.70)",
                  }}
                />
              );
            })}
          </div>

          {wheelDays.map((day) => {
            const angle = (wheelAngleForDay(day) * Math.PI) / 180;
            const radius = 44.5;
            const left = 50 + Math.cos(angle) * radius;
            const top = 50 + Math.sin(angle) * radius;
            const dateKey = dateForPackDay(day);
            const loggedTaken = !!takenAt(dateKey);
            const missed = missedAt(dateKey);
            const isCurrent = day === currentDay;
            const isPlacebo = day > ACTIVE_DAYS;

            // The user confirmed continuous on-time Drovelis use from `since`.
            // Therefore historical active pills are visually treated as taken
            // unless that exact date was explicitly marked missed. This prevents
            // old packs from showing pale/empty circles only because dose logging
            // was added to the app later.
            const assumedHistoricalTaken =
              !isPlacebo && dateKey >= since && dateKey < todayK && !missed;
            const takenForStatus = loggedTaken || assumedHistoricalTaken;

            // Soft 3D pill bubbles.
            // Keep the wheel math/layout untouched; only color-state treatment changes.
            // Active HAK: lighter moss when not taken, darker moss when taken.
            // Placebo/break: pale pink when not taken, darker pink when taken.
            let bubbleBackground = isPlacebo
              ? darkMode
                ? "radial-gradient(circle at 30% 24%, #F5D7E2 0%, #E9A8BE 42%, #D97B9D 78%, #C65D84 100%)"
                : "radial-gradient(circle at 30% 24%, #FFF8FB 0%, #F7D9E6 42%, #EDB7CA 78%, #E39AB6 100%)"
              : darkMode
                ? "radial-gradient(circle at 30% 24%, #DDE5C4 0%, #BAC88C 42%, #96AA64 78%, #7A8F4D 100%)"
                : "radial-gradient(circle at 30% 24%, #F4F8E8 0%, #D8E4B8 42%, #B2C67A 78%, #8EA750 100%)";
            let color = isPlacebo
              ? darkMode ? "#7F2748" : HAK_PINK_DARK
              : darkMode ? "#30351F" : HAK_GREEN_DARK;
            let bubbleBorder = darkMode ? "rgba(245,244,232,.56)" : "rgba(255,255,255,.8)";
            let bubbleShadow = isPlacebo
              ? darkMode
                ? "inset 1.5px 1.5px 3px rgba(255,255,255,.55), inset -1.5px -2px 3px rgba(96,35,59,.22), 0 2px 8px rgba(31,34,20,.30), 0 0 0 1px rgba(240,154,184,.22)"
                : "inset 1.5px 1.5px 3px rgba(255,255,255,.95), inset -1.5px -2px 3px rgba(180,82,118,.12), 0 2px 7px rgba(173,85,117,.16), 0 0 0 1px rgba(217,87,130,.18)"
              : darkMode
                ? "inset 1.5px 1.5px 3px rgba(255,255,255,.48), inset -1.5px -2px 3px rgba(48,53,31,.28), 0 2px 8px rgba(31,34,20,.30), 0 0 0 1px rgba(182,194,142,.24)"
                : "inset 1.5px 1.5px 3px rgba(255,255,255,.92), inset -1.5px -2px 3px rgba(82,107,36,.14), 0 2px 7px rgba(68,92,29,.16), 0 0 0 1px rgba(95,112,51,.20)";

            if (takenForStatus && !isCurrent) {
              if (isPlacebo) {
                bubbleBackground = darkMode
                  ? "radial-gradient(circle at 30% 24%, #E992B0 0%, #D9658D 42%, #C14573 78%, #A93460 100%)"
                  : "radial-gradient(circle at 30% 24%, #FFDDE9 0%, #F6AEC6 42%, #E977A0 78%, #D95782 100%)";
                color = "#FFF7FB";
                bubbleBorder = "rgba(255,255,255,.72)";
                bubbleShadow =
                  "inset 1.5px 1.5px 3px rgba(255,255,255,.65), inset -1.5px -2px 3px rgba(135,39,77,.20), 0 2px 8px rgba(154,58,95,.22), 0 0 0 1px rgba(185,46,96,.28)";
              } else {
                bubbleBackground = darkMode
                  ? "radial-gradient(circle at 30% 24%, #AFC17A 0%, #849B52 42%, #667E3B 78%, #4F642D 100%)"
                  : "radial-gradient(circle at 30% 24%, #DDE7C3 0%, #A7B878 42%, #7C914B 78%, #5A6C31 100%)";
                color = "#FFFDF3";
                bubbleBorder = "rgba(255,255,255,.72)";
                bubbleShadow =
                  "inset 1.5px 1.5px 3px rgba(255,255,255,.72), inset -1.5px -2px 3px rgba(61,75,31,.18), 0 2px 8px rgba(54,68,30,.20), 0 0 0 1px rgba(79,96,40,.28)";
              }
            }

            if (isCurrent) {
              if (isPlacebo) {
                bubbleBackground = takenForStatus
                  ? darkMode
                    ? "radial-gradient(circle at 30% 24%, #E992B0 0%, #D45F88 46%, #B93C68 100%)"
                    : "radial-gradient(circle at 30% 24%, #FFD7E5 0%, #F4A5BE 46%, #E46F99 100%)"
                  : darkMode
                    ? "radial-gradient(circle at 30% 24%, #F5D7E2 0%, #E8A8BD 46%, #D77A9B 100%)"
                    : "radial-gradient(circle at 30% 24%, #FFF7FB 0%, #F6D8E6 46%, #E9B7CA 100%)";
                color = takenForStatus ? "#FFF7FB" : darkMode ? "#7F2748" : HAK_PINK_DARK;
                bubbleBorder = "rgba(255,255,255,.88)";
                bubbleShadow =
                  `inset 1.5px 1.5px 3px rgba(255,255,255,.78), inset -1.5px -2px 3px rgba(145,57,91,.16), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(217,87,130,.30), 0 3px 10px rgba(154,58,95,.18)`;
              } else {
                bubbleBackground = takenForStatus
                  ? darkMode
                    ? "radial-gradient(circle at 30% 24%, #AFC17A 0%, #80984E 48%, #53682F 100%)"
                    : "radial-gradient(circle at 30% 24%, #B8C988 0%, #7F9650 48%, #52652D 100%)"
                  : darkMode
                    ? "radial-gradient(circle at 30% 24%, #DCE5C1 0%, #B8C789 46%, #91A75E 100%)"
                    : "radial-gradient(circle at 30% 24%, #F2F7E2 0%, #D6E2B3 46%, #AFC573 100%)";
                color = takenForStatus ? "#fff" : darkMode ? "#30351F" : HAK_GREEN_DARK;
                bubbleBorder = "rgba(255,255,255,.88)";
                bubbleShadow = takenForStatus
                  ? `inset 1.5px 1.5px 3px rgba(255,255,255,.42), inset -1.5px -2px 3px rgba(49,62,27,.22), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(95,112,51,.30), 0 3px 10px rgba(52,65,30,.22)`
                  : `inset 1.5px 1.5px 3px rgba(255,255,255,.88), inset -1.5px -2px 3px rgba(88,111,39,.14), 0 0 0 3px ${HAK_CARD_BG}, 0 0 0 6px rgba(127,163,59,.22), 0 3px 10px rgba(79,101,34,.14)`;
              }
            }

            if (missed) {
              bubbleBorder = "#C94A55";
              bubbleShadow =
                "inset 1.5px 1.5px 3px rgba(255,255,255,.75), 0 0 0 2px rgba(201,74,85,.22), 0 2px 8px rgba(120,55,61,.16)";
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSel(dateKey);
                }}
                className="absolute z-10 grid h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold transition active:scale-95"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  background: bubbleBackground,
                  color,
                  border: `1px solid ${bubbleBorder}`,
                  boxShadow: bubbleShadow,
                  textShadow: isCurrent
                    ? "0 1px 1px rgba(50,30,80,.12)"
                    : "0 1px 0 rgba(255,255,255,.45)",
                }}
                aria-label={`HAK day ${day}, ${fmtFullDate(dateKey)}${missed ? ", missed" : takenForStatus ? ", taken on schedule" : ""}`}
              >
                {day}
              </button>
            );
          })}

          {/* Current day status — kept clear of the top pill bubbles. */}
          <div className="pointer-events-none absolute left-[25%] right-[25%] top-[20%] z-20 text-center">
            <p className="text-[10px] font-semibold leading-none text-foreground">{t("Day")}</p>
            <p
              className="mt-0.5 font-serif text-[clamp(1.85rem,7.5vw,2.45rem)] font-bold leading-none"
              style={{ color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK }}
            >
              {currentDay} / {PACK_DAYS}
            </p>

            {currentDay > ACTIVE_DAYS && (
              <p
                className="mt-1 text-[10px] font-semibold leading-none"
                style={{ color: HAK_PINK_DARK }}
              >
                Placebo / break
              </p>
            )}
          </div>

          {/* Calendar — actual date stays large; HAK pill number stays as small Pxx. */}
          <div className="pointer-events-none absolute left-[16.5%] right-[16.5%] top-[34.5%] z-20 text-center">
            <p className="text-[14px] font-bold leading-none text-foreground">
              {hakMonthLabel}
            </p>

            <div className="mt-1.5 grid grid-cols-7 text-center text-[10px] font-semibold leading-none text-foreground/75">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-x-[2px] gap-y-[1px]">
              {hakMonthCells.map((cell) => {
                if (!cell.inMonth) {
                  return <span key={cell.key} className="h-[20px]" aria-hidden="true" />;
                }

                const packDay = cell.packDay;
                const loggedTaken = !!takenAt(cell.key);
                const missed = missedAt(cell.key);
                const isToday = cell.key === todayK;
                const isPlacebo = packDay != null && packDay > ACTIVE_DAYS;
                const isNewPack = packDay === 1;

                const chipBg =
                  packDay == null
                    ? "transparent"
                    : isPlacebo
                      ? darkMode ? "rgba(227,111,152,.72)" : "rgba(239,154,184,.72)"
                      : isNewPack
                        ? darkMode ? "rgba(169,199,111,.68)" : "rgba(176,185,81,.72)"
                        : darkMode ? "rgba(175,193,122,.68)" : "rgba(101,119,58,.76)";

                const chipColor =
                  packDay == null
                    ? "transparent"
                    : isPlacebo
                      ? HAK_PINK_DARK
                      : isNewPack
                        ? HAK_GREEN_DARK
                        : HAK_PURPLE_DARK;

                return (
                  <span
                    key={cell.key}
                    className="flex h-[20px] min-w-0 flex-col items-center justify-start"
                    aria-label={
                      packDay == null
                        ? fmtFullDate(cell.key)
                        : `${fmtFullDate(cell.key)}, HAK day ${packDay}${loggedTaken ? ", taken" : missed ? ", missed" : ""}`
                    }
                  >
                    <span
                      className="grid h-[10px] min-w-[16px] place-items-center rounded-full px-[1px] text-[10px] font-bold leading-none tabular-nums"
                      style={{
                        color: "var(--foreground)",
                        boxShadow: isToday ? (darkMode ? "0 0 0 1px rgba(221,220,203,.75)" : "0 0 0 1px rgba(65,76,18,.68)") : undefined,
                      }}
                    >
                      {cell.date.getDate()}
                    </span>

                    {packDay != null && (
                      <span
                        className="mt-[1px] max-w-[30px] truncate rounded-[3px] px-[2px] py-[1px] text-[5.7px] font-bold leading-none tabular-nums"
                        style={{
                          backgroundColor: chipBg,
                          color: chipColor,
                        }}
                      >
                        P{packDay}{loggedTaken ? " ✓" : missed ? " ×" : ""}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Keep Current HAK pack exactly in the previous compact timeline style. */}
      <div className="mt-4">
        <h3 className="font-serif text-lg font-bold text-foreground">{t("Current HAK pack")}</h3>
        <div
          className="mt-3 rounded-[1.75rem] px-4 py-4 ring-1"
          style={{
            backgroundColor: darkMode ? "rgba(90,96,64,.72)" : "rgba(255,255,255,.20)",
            borderColor: darkMode ? "rgba(119,125,88,.82)" : "rgba(95,112,51,.22)",
          }}
        >
          <div className="grid grid-cols-[1.35fr_1fr_.9fr] items-start gap-2 text-center">
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_PURPLE_DARK }}>{t("Active HAK days")}</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_PURPLE_DARK }}>1–{ACTIVE_DAYS}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_PINK_DARK }}>{t("Placebo / break")}</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_PINK_DARK }}>{ACTIVE_DAYS + 1}–{PACK_DAYS}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: HAK_GREEN_DARK }}>{t("New cycle")}</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: HAK_GREEN_DARK }}>{t("Day 1")}</p>
            </div>
          </div>

          <div className="relative mt-4 px-1 pb-8">
            <div
              className="rounded-full px-2 py-2 ring-1"
              style={{
                backgroundColor: darkMode ? "rgba(65,71,45,.76)" : "rgba(255,255,255,.30)",
                borderColor: darkMode ? "rgba(119,125,88,.78)" : "rgba(95,112,51,.22)",
              }}
            >
              <div
                className="grid items-center gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${timelineItems.length}, minmax(0, 1fr))` }}
              >
                {timelineItems.map((item, index) => {
                  const isCurrent = index === timelineCurrentIndex;
                  const itemColor =
                    item.kind === "active"
                      ? HAK_PURPLE_DOT
                      : item.kind === "placebo"
                        ? HAK_PINK
                        : item.kind === "next"
                          ? HAK_GREEN
                          : HAK_TRACK;

                  return (
                    <span
                      key={`${item.kind}-${index}`}
                      className="mx-auto block aspect-square w-full max-w-[10px] rounded-full"
                      style={{
                        backgroundColor: itemColor,
                        boxShadow: isCurrent
                          ? `0 0 0 3px ${HAK_CARD_BG}, 0 0 0 5px ${
                              item.kind === "placebo" ? HAK_PINK_DARK : HAK_PURPLE_DARK
                            }`
                          : item.kind === "next"
                            ? `0 0 0 2px ${HAK_GREEN_SOFT}`
                            : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div
              className="absolute bottom-[22px] h-4 w-px"
              style={{
                left: `${timelineMarkerLeft}%`,
                backgroundColor: currentDay <= ACTIVE_DAYS ? HAK_PURPLE : HAK_PINK,
              }}
            />
            <p
              className="absolute bottom-0 whitespace-nowrap text-[11px] font-bold"
              style={{
                left: `${timelineMarkerLeft}%`,
                transform: "translateX(-50%)",
                color: currentDay <= ACTIVE_DAYS ? HAK_PURPLE_DARK : HAK_PINK_DARK,
              }}
            >
              Day {currentDay} / {PACK_DAYS}
            </p>
          </div>
        </div>
      </div>

        </div>
        <div className="min-w-0 lg:pt-12">
      <div
        className="mt-3 rounded-[1.5rem] px-2 py-2 ring-1 lg:mt-0"
        style={{
          backgroundColor: darkMode ? "rgba(90,96,64,.70)" : "rgba(255,255,255,.24)",
          borderColor: darkMode ? "rgba(119,125,88,.76)" : "rgba(95,112,51,.18)",
        }}
      >
        <div
          className="grid grid-cols-4 overflow-hidden rounded-[1.1rem] bg-white/25"
          style={{ backgroundColor: darkMode ? "rgba(65,71,45,.62)" : undefined }}
        >
          <div className="px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-pink-100/80 text-[13px]"><Ico e="🫐" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">{t("Menstruation")}</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS - ACTIVE_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPlaceboStart)} – {fmtShortDate(currentPlaceboEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-[13px] text-primary"><Ico e="🩸" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">{t("Cycle")}</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPackStart)} – {fmtShortDate(currentPackEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-[13px] text-primary"><Ico e="💊" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">{t("Taking HAK")}</p>
            <p className="text-[11px] font-bold text-foreground">{PACK_DAYS} days</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {fmtShortDate(currentPackStart)} – {fmtShortDate(currentPackEnd)}
            </p>
          </div>

          <div className="border-l border-border/50 px-2 py-3 text-center">
            <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-lime-100/80 text-[13px]"><Ico e="🛡️" size={18} /></span>
            <p className="mt-1 text-[10px] font-semibold text-foreground">{t("Protection")}</p>
            <p className="text-[11px] font-bold" style={{ color: HAK_GREEN_DARK }}>
              {protectionActive ? "Active" : "Waiting"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">From {fmtShortDate(protectionStart)}</p>
          </div>
        </div>
      </div>

      {/* ŠukŠuk Insights summary — added inside the HAK calendar only. */}
      <SukSukPeriodChart data={data} anchorKey={todayKey()} darkMode={darkMode} />
        </div>
      </div>

      {/* Compact dose editor — only circular HAK wheel pills open this popup. */}
      {sel && selectedDay != null && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-5"
              style={{
                paddingTop: "max(1rem, env(safe-area-inset-top))",
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
              onClick={() => setSel(null)}
            >
              <div
                className="w-full max-w-[300px] rounded-[1.55rem] p-4 shadow-2xl ring-1"
                style={{
                  backgroundColor: popupSoft,
                  borderColor: popupAccent,
                  boxShadow: `0 18px 45px color-mix(in srgb, ${popupAccent} 22%, transparent)`,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: popupAccent }}
                    >
                      HAK day {selectedDay}
                    </p>
                    <h3 className="mt-1 font-serif text-[1.05rem] font-bold leading-tight text-foreground">
                      {fmtFullDate(sel)}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSel(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ring-1"
                    style={{
                      backgroundColor: darkMode ? "rgba(102,109,73,.72)" : "rgba(255,255,255,.42)",
                      borderColor: `color-mix(in srgb, ${popupAccent} 35%, transparent)`,
                      color: popupAccent,
                    }}
                    aria-label={t("Close")}
                  >
                    ×
                  </button>
                </div>

                {selectedTaken ? (
                  <div
                    className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                    style={{
                      backgroundColor: darkMode ? "rgba(102,109,73,.62)" : "rgba(255,255,255,.38)",
                      border: `1.5px solid ${popupAccent}`,
                      color: popupAccent,
                    }}
                    aria-label={t("Tablet already taken")}
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white"
                      style={{ backgroundColor: popupAccent }}
                    >
                      ✓
                    </span>
                    Taken
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          markTaken(sel, "");
                          setSel(null);
                        }}
                        className="min-h-11 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: popupAccent }}
                      >
                        Mark taken
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          markMissed(sel);
                          setSel(null);
                        }}
                        className="min-h-11 rounded-xl bg-white/35 px-3 py-2.5 text-xs font-bold"
                        style={{
                          border: `1.5px solid ${popupAccent}`,
                          color: popupAccent,
                        }}
                      >
                        Mark missed
                      </button>
                    </div>

                    {selectedMissed && (
                      <button
                        type="button"
                        onClick={() => {
                          clearRecord(sel);
                          setSel(null);
                        }}
                        className="mt-2 min-h-9 w-full rounded-xl bg-white/30 px-3 py-2 text-[10px] font-semibold"
                        style={{
                          border: `1px solid color-mix(in srgb, ${popupAccent} 32%, transparent)`,
                          color: popupAccent,
                        }}
                      >
                        Clear missed status
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

    </section>
  );
}


