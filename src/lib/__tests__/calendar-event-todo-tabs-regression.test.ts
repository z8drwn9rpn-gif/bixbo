import { describe, expect, it } from "vitest";
import fs from "node:fs";

const calendar = fs.readFileSync("src/components/MonthCalendar.tsx", "utf8");

describe("calendar event / To Do tabs", () => {
  it("keeps Calendar Events as the default and exposes a To Do List tab", () => {
    expect(calendar).toContain('useState<"events"|"tasks">("events")');
    expect(calendar).toContain('role="tablist"');
    expect(calendar).toContain('t("Calendar events")');
    expect(calendar).toContain('t("To do list")');
  });

  it("uses the existing BIXBO tasks collection for the displayed month", () => {
    expect(calendar).toContain("data.tasks.filter(task=>task.startDate<=monthEnd&&task.endDate>=monthStart)");
    expect(calendar).toContain("monthTasks.map((task,index)");
    expect(calendar).toContain('t("No tasks this month")');
  });

  it("renders task completion with a BIXBO icon rather than a system emoji", () => {
    expect(calendar).toContain('import { Check, Ico } from "@/components/icons/BixboExtraIcons"');
    expect(calendar).toContain('<Check className="h-3 w-3"');
  });
});
