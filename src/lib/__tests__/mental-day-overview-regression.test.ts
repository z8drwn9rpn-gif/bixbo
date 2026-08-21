import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mental distress daily overview", () => {
  it("mounts the mental card immediately after Pain without growing DayOverview", () => {
    const dayOverview = readFileSync("src/components/home/DayOverview.tsx", "utf8");
    const fallback = readFileSync("src/components/home/BlueberryDayOverviewFallback.tsx", "utf8");
    const mentalCard = readFileSync("src/components/home/MentalDistressDayOverviewCard.tsx", "utf8");

    expect(dayOverview).not.toContain("MentalDistressDayOverviewCard");
    expect(fallback).toContain('[data-bixbo-day-overview-card="pain"]');
    expect(fallback).toContain('painCard.insertAdjacentElement("afterend", host)');
    expect(fallback).toContain("createPortal(");
    expect(fallback).toContain("<MentalDistressDayOverviewCard");

    expect(mentalCard).toContain('<Card title="Mental distress"');
    expect(mentalCard).toContain("DayOverviewDeleteButton as DeleteBtn");
    expect(mentalCard).toContain('<DeleteBtn onClick={() => deleteEntry(entry.id)} />');
    expect(mentalCard).toContain('onEdit?.("custom:mental-wellbeing", entry)');
    expect(mentalCard).toContain('className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"');
  });

  it("opens the tapped mental entry prefilled for editing", () => {
    const fallback = readFileSync("src/components/home/BlueberryDayOverviewFallback.tsx", "utf8");
    const customLogForm = readFileSync("src/components/CustomLogForm.tsx", "utf8");
    const mentalForm = readFileSync("src/features/logging/MentalWellbeingForm.tsx", "utf8");

    expect(fallback).toContain("setEditingMental(entry as MentalOverviewEntry)");
    expect(fallback).toContain("initialEntry={editingMental as unknown as CustomLogEntry}");
    expect(customLogForm).toContain("initialEntry={initialEntry as unknown as MentalWellbeingEntry | undefined}");
    expect(mentalForm).toContain("initialEntry?: MentalWellbeingEntry");
    expect(mentalForm).toContain("useState<string | null>(initialEntry?.id ?? null)");
    expect(mentalForm).toContain("useState(initialEntry?.distress ?? 0)");
    expect(mentalForm).toContain("useState<string[]>(initialEntry?.states ?? [])");
    expect(mentalForm).toContain("useState<string[]>(initialEntry?.factors ?? [])");
  });
});
