import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const EN_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SK_MONTHS = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];

function visibleMonthIndex(label: string) {
  const normalized = label.trim().toLowerCase();
  const en = EN_MONTHS.findIndex((month) => normalized.includes(month));
  if (en >= 0) return en;
  return SK_MONTHS.findIndex((month) => normalized.includes(month));
}

export function CalendarTargetBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (pathname !== "/") return;
    const match = /^#date=(\d{4})-(\d{2})-(\d{2})$/.exec(window.location.hash);
    if (!match) return;

    const targetYear = Number(match[1]);
    const targetMonth = Number(match[2]) - 1;
    const targetDay = Number(match[3]);
    let attempts = 0;
    let timer = 0;

    const finish = () => {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    };

    const step = () => {
      attempts += 1;
      const heading = document.querySelector<HTMLElement>("h2[data-bixbo-display-title]");
      if (!heading) {
        if (attempts < 40) timer = window.setTimeout(step, 80);
        return;
      }

      const label = heading.textContent ?? "";
      const currentYear = Number(label.match(/\b(20\d{2})\b/)?.[1]);
      const currentMonth = visibleMonthIndex(label);
      if (!Number.isFinite(currentYear) || currentMonth < 0) {
        if (attempts < 40) timer = window.setTimeout(step, 80);
        return;
      }

      const currentIndex = currentYear * 12 + currentMonth;
      const targetIndex = targetYear * 12 + targetMonth;
      if (currentIndex !== targetIndex) {
        const controls = heading.parentElement?.querySelectorAll<HTMLButtonElement>("button");
        const button = controls?.[targetIndex < currentIndex ? 0 : 1];
        if (button && attempts < 40) {
          button.click();
          timer = window.setTimeout(step, 90);
        }
        return;
      }

      const headingRow = heading.parentElement?.parentElement;
      const calendarRoot = headingRow?.nextElementSibling as HTMLElement | null;
      const candidates = Array.from(calendarRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []);
      const dayButton = candidates.find((button) => button.textContent?.trim() === String(targetDay));
      if (dayButton) {
        dayButton.click();
        window.setTimeout(() => {
          const main = document.getElementById("main-content");
          const overviewHeading = Array.from(main?.querySelectorAll<HTMLElement>("h2") ?? []).find((item) => item !== heading && item.textContent?.trim());
          overviewHeading?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
        finish();
      } else if (attempts < 40) {
        timer = window.setTimeout(step, 80);
      }
    };

    timer = window.setTimeout(step, 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
