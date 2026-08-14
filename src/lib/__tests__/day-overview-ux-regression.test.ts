import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Day Overview UX consistency", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/home/DayOverview.tsx"), "utf8");

  it("uses explicit Note labels instead of bare quoted notes", () => {
    expect(source).toContain('{t("Note")}:</span> {log.periodInfo.note}');
    expect(source).toContain('{t("Note")}:</span> {p.note}');
    expect(source).toContain('{t("Note")}:</span> {sx.note}');
    expect(source).toContain('{t("Note")}:</span> {h.note}');
    expect(source).toContain('{t("Note")}:</span> {w.note}');
  });

  it("keeps the compact cards on the same labelled hierarchy", () => {
    expect(source).toContain('<Card title="Blueberry" icon="🫐">');
    expect(source).toContain('<Card title="ŠukŠuk!" icon="❤️" compact>');
    expect(source).toContain('<Card title="Heat / Cold / TENS" icon="♨️">');
    expect(source).toContain('<Card title="Food" icon="🍽️" compact>');
    expect(source).toContain('<Card title="Workout" icon="👟">');
    expect(source.match(/border-t border-border\/60/g)?.length ?? 0).toBeGreaterThan(5);
  });
});
