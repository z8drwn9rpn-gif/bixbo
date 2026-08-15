const BIXBO_TEXT_EMOJIS = [
  "😀", "😂", "🥰", "😈", "😢", "😡", "😴", "🤒", "🥵", "🥶",
  "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤", "🤍", "💔", "💕", "💖",
  "👤", "👩", "👨", "🧑", "👶", "👵", "👴", "👥", "👫", "👭", "👬", "🫶", "🙏", "👍", "👎", "👏",
  "💊", "💉", "🩹", "🩺", "🧬", "🌡️", "🩸", "💤", "🌙", "🛏️", "🧠", "⚡", "🔥", "💩",
  "🍎", "🍌", "🫐", "🍓", "🍞", "🍝", "🍚", "🍕", "🥚", "🧀", "🐟", "🥩", "🍗", "🥗", "🍲", "🥛", "☕", "🍵", "🥪", "🍰", "🧁",
  "🌸", "🌷", "🌹", "🌻", "🌳", "🌲", "🌴", "🌵", "🪴", "🌿", "🍃", "☀️", "☁️", "🌧️", "❄️", "🌈",
  "🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐧", "🦋", "🐢", "🐠", "🐬", "🐘",
  "👟", "🏃", "🚶", "🏋️", "🧘", "🏊", "🚴", "⚽", "🏀", "🎾", "🏆", "🥇",
  "🚗", "🚕", "🚌", "🚑", "🚲", "✈️", "🚀", "🚁", "🏠", "🏥", "🏨", "🏫",
  "📱", "💻", "📷", "🎥", "🎵", "🎧", "📖", "📝", "📅", "✅", "🔒", "🔑", "💰", "🎁", "🎉", "⭐", "✨", "⚠️",
] as const;

const PUA_START = 0xe000;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function stripVariationSelectors(value: string) {
  return value.replace(/\uFE0F/g, "");
}

export function splitBixboGraphemes(value: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const Segmenter = (Intl as typeof Intl & {
      Segmenter?: new (
        locale?: string | string[],
        options?: { granularity: "grapheme" },
      ) => { segment: (input: string) => Iterable<{ segment: string }> };
    }).Segmenter;
    if (Segmenter) {
      return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment);
    }
  }
  return Array.from(value);
}

const emojiToGlyph = new Map<string, string>();
const glyphToEmoji = new Map<string, string>();

BIXBO_TEXT_EMOJIS.forEach((emoji, index) => {
  const glyph = String.fromCharCode(PUA_START + index);
  emojiToGlyph.set(emoji, glyph);
  emojiToGlyph.set(stripVariationSelectors(emoji), glyph);
  glyphToEmoji.set(glyph, emoji);
});

export function bixboNativeGlyphForEmoji(emoji: string) {
  return emojiToGlyph.get(emoji) ?? emojiToGlyph.get(stripVariationSelectors(emoji));
}

export function canonicalBixboEmoji(emoji: string) {
  const glyph = bixboNativeGlyphForEmoji(emoji);
  return glyph ? glyphToEmoji.get(glyph) : undefined;
}

export function decodeBixboNativeText(value: string) {
  return Array.from(value, (part) => glyphToEmoji.get(part) ?? part).join("");
}

export function normalizeBixboText(value: string) {
  return splitBixboGraphemes(value)
    .map((part) => {
      const known = canonicalBixboEmoji(part);
      if (known) return known;
      return EMOJI_RE.test(part) ? "⭐" : part;
    })
    .join("");
}

export function encodeBixboNativeText(value: string) {
  return splitBixboGraphemes(normalizeBixboText(value))
    .map((part) => bixboNativeGlyphForEmoji(part) ?? part)
    .join("");
}
