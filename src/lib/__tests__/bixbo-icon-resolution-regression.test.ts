import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("BIXBO icon resolution", () => {
  it("resolves exact BIXBO drawings before broad keyboard category fallbacks", () => {
    const source = read("src/components/icons/BixboIcon.tsx");
    expect(source).toContain('import { specificEmojiIcon } from "./BixboSpecificEmojiIcons"');
    expect(source.indexOf("specificEmojiIcon(emoji)")).toBeLessThan(source.indexOf("keyboardEmojiIcon(emoji)"));
  });

  it("keeps representative exact animal, vehicle and medical mappings", () => {
    const source = read("src/components/icons/BixboSpecificEmojiIcons.tsx");
    for (const emoji of ["🐶", "🐱", "🐧", "🚑", "🚒", "🚲", "💉", "🩹", "🩺", "🧬", "🦠"]) {
      expect(source).toContain(`"${emoji}"`);
    }
  });

  it("routes legacy Ico emoji render slots through the central BixboIcon at build time", () => {
    const source = read("src/build/bixboIconMigrationPlugin.ts");
    expect(source).toContain('replaceAll("<Ico e=", "<BixboIcon emoji=")');
    expect(source).toContain("isIconImplementation");
  });
});