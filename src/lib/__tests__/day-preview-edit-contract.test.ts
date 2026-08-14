import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
// Day Overview is intentionally split into orchestration + focused cards/primitives.
const source = [
  read("src/routes/index.tsx"),
  read("src/components/home/DayOverview.tsx"),
  read("src/components/home/DayOverviewSexCard.tsx"),
  read("src/components/home/DayOverviewPrimitives.tsx"),
].join("\n");

describe("DayPreview edit interaction contract", () => {
  it("keeps tap-to-edit wiring for every editable health log shown in the daily overview", () => {
    for (const category of ["panic", "tetany", "sex", "heat", "food", "bowel", "workout", "task", "event"]) {
      expect(source).toContain(`onEdit?.("${category}"`);
    }
    expect(source).toContain("onEditPain?.(p)");
    expect(source).toContain('onEdit?.("temp", undefined)');
    expect(source).toContain('onEdit?.("meds", e)');
    expect(source).toContain('onEdit?.(`custom:${definition.id}`, entry)');
  });

  it("keeps delete controls separate from entry edit buttons", () => {
    expect(source).toContain("function DayOverviewDeleteButton");
    expect(source).toContain('aria-label={t("Delete")}');
  });
});
