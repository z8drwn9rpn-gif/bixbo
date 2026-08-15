import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("BIXBO icon resolution", () => {
  it("resolves exact BIXBO drawings before broad keyboard category fallbacks", () => {
    const source = read("src/components/icons/BixboIcon.tsx");
    expect(source).toContain('import { appEmojiIcon } from "./BixboAppEmojiIcons"');
    expect(source).toContain('import { pickerEmojiIcon } from "./BixboPickerEmojiIcons"');
    expect(source).toContain('import { specificEmojiIcon } from "./BixboSpecificEmojiIcons"');
    expect(source.indexOf("appEmojiIcon(emoji)")).toBeLessThan(source.indexOf("keyboardEmojiIcon(emoji)"));
    expect(source.indexOf("pickerEmojiIcon(emoji)")).toBeLessThan(source.indexOf("keyboardEmojiIcon(emoji)"));
    expect(source.indexOf("specificEmojiIcon(emoji)")).toBeLessThan(source.indexOf("keyboardEmojiIcon(emoji)"));
  });

  it("keeps representative exact animal, vehicle and medical mappings", () => {
    const source = read("src/components/icons/BixboSpecificEmojiIcons.tsx");
    for (const emoji of ["🐶", "🐱", "🐧", "🚑", "🚒", "🚲", "💉", "🩹", "🩺", "🧬", "🦠"]) {
      expect(source).toContain(`"${emoji}"`);
    }
  });

  it("keeps exact BIXBO drawings for app-used mood, sleep, therapy and daily-life emoji", () => {
    const source = read("src/components/icons/BixboAppEmojiIcons.tsx");
    for (const emoji of [
      "😀", "🙂", "😊", "😌", "😐", "😢", "😠", "😴", "😵‍💫", "🤢", "🤕", "🥵", "🥶",
      "💪", "💦", "🌩️", "🏃", "🌙", "💭", "📱", "☀️", "💤", "🐢", "🚽", "🦵", "🌡️",
      "⏰", "🛌", "🧘", "⚡", "🌀", "🧊", "♨️", "⭐", "🥑", "🌶️",
    ]) {
      expect(source).toContain(`"${emoji}"`);
    }
  });

  it("keeps distinct BIXBO picker drawings instead of broad category stand-ins", () => {
    const source = read("src/components/icons/BixboPickerEmojiIcons.tsx");
    for (const emoji of [
      "🩷", "🧡", "💛", "💚", "💙", "💜", "💔", "👩", "👨", "👶", "👵",
      "🐨", "🐯", "🦁", "🐸", "🐘", "🌴", "🌵", "🪴", "🌈", "🚕", "✈️", "🚀",
      "🚁", "🏠", "🏥", "🏨", "🏫", "💻", "📷", "🎥", "🎵", "🎧", "📖", "🔒",
      "🔑", "💰", "🎁", "🎉", "🏆", "🥇",
    ]) {
      expect(source).toContain(`"${emoji}"`);
    }
  });

  it("routes every legacy emoji visual helper through central BIXBO rendering at build time", () => {
    const source = read("src/build/bixboIconMigrationPlugin.ts");
    expect(source).toContain('replaceAll("<Ico e=", "<BixboIcon emoji=")');
    expect(source).toContain('replaceAll("<IcoText", "<BixboSafeText")');
    expect(source).toContain('replaceAll("<SemanticIcoText", "<BixboSafeText")');
    expect(source).toContain('.replace(/<SemanticIco\\b/g, "<BixboIcon")');
    expect(source).toContain('.replace(/fallbackEmoji=/g, "emoji=")');
    expect(source).toContain("isIconImplementation");
  });
});