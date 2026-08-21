import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mental distress daily overview", () => {
  it("keeps mental distress directly after the pain card with pain-style actions", () => {
    const dayOverview = readFileSync("src/components/home/DayOverview.tsx", "utf8");
    const mentalCard = readFileSync("src/components/home/MentalDistressDayOverviewCard.tsx", "utf8");

    const painCard = dayOverview.indexOf('<Card title="Pain"');
    const mentalCardMount = dayOverview.indexOf("<MentalDistressDayOverviewCard");
    const standaloneSymptoms = dayOverview.indexOf('<Card title="Add symptoms"');

    expect(painCard).toBeGreaterThan(-1);
    expect(mentalCardMount).toBeGreaterThan(painCard);
    expect(standaloneSymptoms).toBeGreaterThan(mentalCardMount);
    expect(dayOverview).toContain("mentalWellbeingCount");

    expect(mentalCard).toContain('<Card title="Mental distress"');
    expect(mentalCard).toContain("DayOverviewDeleteButton as DeleteBtn");
    expect(mentalCard).toContain('<DeleteBtn onClick={() => deleteEntry(entry.id)} />');
    expect(mentalCard).toContain('onEdit?.("custom:mental-wellbeing", entry)');
    expect(mentalCard).toContain('className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"');
  });

  it("opens the tapped mental entry prefilled for editing", () => {
    const customLogForm = readFileSync("src/components/CustomLogForm.tsx", "utf8");
    const mentalForm = readFileSync("src/features/logging/MentalWellbeingForm.tsx", "utf8");

    expect(customLogForm).toContain("initialEntry={initialEntry as unknown as MentalWellbeingEntry | undefined}");
    expect(mentalForm).toContain("initialEntry?: MentalWellbeingEntry");
    expect(mentalForm).toContain("useState<string | null>(initialEntry?.id ?? null)");
    expect(mentalForm).toContain("useState(initialEntry?.distress ?? 0)");
    expect(mentalForm).toContain("useState<string[]>(initialEntry?.states ?? [])");
    expect(mentalForm).toContain("useState<string[]>(initialEntry?.factors ?? [])");
  });
});
