import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const primitives = readFileSync("src/components/home/DayOverviewPrimitives.tsx", "utf8");
const overview = readFileSync("src/components/home/DayOverview.tsx", "utf8");

describe("Day Overview Food row alignment", () => {
  it("keeps the Food label and food value starting on the same row", () => {
    expect(overview).toContain('<Card title="Food" icon="🍽️" compact>');
    expect(primitives).toContain('title === "Food"');
    expect(primitives).toContain('[&_li>button>div+p]:flex');
    expect(primitives).toContain('[&_li>button>div+p]:items-start');
    expect(primitives).toContain('[&_li>button>div+p>span:first-child]:shrink-0');
    expect(primitives).toContain('[&_li>button>div+p>span:last-child]:min-w-0');
    expect(primitives).toContain('[&_li>button>div+p>span:last-child]:flex-1');
  });
});
