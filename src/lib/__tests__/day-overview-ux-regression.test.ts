import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Day Overview UX consistency", () => {
  const overviewSource = read("src/components/home/DayOverview.tsx");
  const sexSource = read("src/components/home/DayOverviewSexCard.tsx");
  const source = `${overviewSource}\n${sexSource}`;

  it("uses explicit Note labels instead of bare quoted notes", () => {
    expect(source).toContain('{t("Note")}:</span> {log.periodInfo.note}');
    expect(source).toContain('{t("Note")}:</span> {p.note}');
    expect(source).toContain('{t("Note")}:</span> {sx.note}');
    expect(source).toContain('{t("Note")}:</span> {h.note}');
    expect(source).toContain('{t("Note")}:</span> {w.note}');
  });

  it("keeps the compact cards on the same labelled hierarchy", () => {
    expect(overviewSource).toContain('<Card title="Blueberry" icon="🫐">');
    expect(sexSource).toContain('<DayOverviewCard title="ŠukŠuk!" icon="❤️" compact>');
    expect(overviewSource).toContain('<Card title="Heat / Cold / TENS" icon="♨️">');
    expect(overviewSource).toContain('<Card title="Food" icon="🍽️" compact>');
    expect(overviewSource).toContain('<Card title="Workout" icon="👟">');
    expect(source.match(/border-t border-border\/60/g)?.length ?? 0).toBeGreaterThan(5);
  });
});
