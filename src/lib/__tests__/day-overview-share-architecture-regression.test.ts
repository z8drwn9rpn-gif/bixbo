import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DayOverview share architecture", () => {
  it("keeps HomePage share behavior in the isolated share module", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const share = readFileSync("src/components/home/DayOverviewShareButton.tsx", "utf8");

    expect(home).toContain('import { DayPreview } from "@/components/home/DayOverview"');
    expect(home).toContain('import { ShareDayButton } from "@/components/home/DayOverviewShareButton"');
    expect(home).not.toContain("DayPreview, ShareDayButton");

    expect(share).toContain("navigator.share");
    expect(share).toContain("navigator.clipboard.writeText(text)");
    expect(share).toContain("— sent from BIXBO");
    expect(share).toContain("export const stripEmoji");
  });
});
