import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA app icon", () => {
  it("uses the versioned opaque BIXBO penguin icon instead of the stale transparent asset", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const manifest = readFileSync("public/manifest.json", "utf8");

    expect(existsSync("public/apple-touch-icon-bixbo-v2.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-icon-precomposed"');
    expect(root).toContain('href: "/apple-touch-icon-bixbo-v2.png?v=1"');
    expect(manifest).toContain('"src": "/apple-touch-icon-bixbo-v2.png?v=1"');
  });
});
