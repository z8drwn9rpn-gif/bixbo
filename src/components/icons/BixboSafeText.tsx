import { Fragment } from "react";
import { Ico, NoteIcon } from "./BixboExtraIcons";
import { semanticIconForLabel } from "./BixboFoodIcons";
import { keyboardEmojiIcon } from "./BixboKeyboardEmojiIcons";

// Covers normal pictographic emoji, ZWJ families/professions, skin tones,
// flags and keycap emoji so iOS never gets a chance to render them natively.
const EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
const HAS_EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic})/u;

const FOOD_EMOJI_LABELS: Record<string, string> = {
  "🍎": "apple",
  "🍏": "apple",
  "🍌": "banana",
  "🫐": "blueberry",
  "🍓": "berry",
  "🍇": "berries",
  "🍞": "bread",
  "🥖": "bread",
  "🥯": "bagel",
  "🍝": "pasta",
  "🍚": "rice",
  "🍙": "rice",
  "🍕": "pizza",
  "🥚": "egg",
  "🍳": "egg",
  "🧀": "cheese",
  "🐟": "fish",
  "🐠": "fish",
  "🍣": "fish",
  "🥩": "meat",
  "🍗": "chicken",
  "🍖": "meat",
  "🥗": "salad",
  "🥬": "salad",
  "🍲": "soup",
  "🥣": "soup",
  "🥛": "milk",
  "☕": "coffee",
  "🍵": "tea",
  "💧": "water",
  "🚰": "water",
  "🥪": "sandwich",
  "🌯": "wrap",
  "🍔": "burger",
  "🍰": "cake",
  "🧁": "cake",
  "🍩": "dessert",
  "🍪": "dessert",
};

// Symbols with a dedicated BIXBO icon in the main icon library.
const SAFE_BIXBO_SYMBOLS = new Set([
  "❤️", "❤", "💗", "💖", "💕", "💚",
  "🔥", "⚡", "✨", "⭐", "🌟",
  "💊", "💉", "💩", "💧", "🩸",
  "📝", "📓", "📅", "🗓", "✅", "✔️", "✔",
  "🌡️", "🌡", "⚖️", "⚖", "🌙", "🌛", "🌜", "☀️", "☀",
  "🧠", "👟", "🏋️", "🏋", "🏃", "🥗", "🥣",
  "🍃", "🌿", "⚠️", "⚠", "🙂", "😊", "🙁", "😟",
  "💋", "✋", "🚫", "🛡️", "🛡", "🌊", "🕒", "🎯",
  "🌸", "🫧", "🔋", "🌀", "ℹ️", "ℹ", "🛏️", "🛏", "💤",
  "🫐",
]);

function normalizeEmoji(value: string) {
  return value.replace(/\uFE0F/g, "");
}

export function BixboSafeText({ text, size = 16, className }: { text: string; size?: number; className?: string }) {
  if (!HAS_EMOJI_RE.test(text)) {
    const Semantic = semanticIconForLabel(text);
    if (!Semantic) return <span className={className}>{text}</span>;
    return (
      <span className={["inline-flex items-center gap-1.5", className].filter(Boolean).join(" ")}>
        <Semantic size={size} />
        <span>{text}</span>
      </span>
    );
  }

  const parts = text.split(EMOJI_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (!HAS_EMOJI_RE.test(part)) return <Fragment key={index}>{part}</Fragment>;

        const normalized = normalizeEmoji(part);
        const foodLabel = FOOD_EMOJI_LABELS[normalized];
        if (foodLabel) {
          const FoodIcon = semanticIconForLabel(foodLabel);
          if (FoodIcon) return <FoodIcon key={index} size={size} className="inline-block shrink-0 align-[-0.15em]" />;
        }

        // Mega keyboard coverage: faces, people, hands, animals, nature,
        // weather, travel, objects, celebration, food, sport and symbols.
        const KeyboardIcon = keyboardEmojiIcon(part);
        if (KeyboardIcon) {
          return <KeyboardIcon key={index} size={size} className="inline-block shrink-0 align-[-0.15em]" />;
        }

        if (SAFE_BIXBO_SYMBOLS.has(part) || SAFE_BIXBO_SYMBOLS.has(normalized)) {
          return <Ico key={index} e={part} size={size} className="inline-block shrink-0 align-[-0.15em]" />;
        }

        // Unsupported/new Unicode emoji never leak the Apple renderer.
        // Keep a neutral BIXBO glyph rather than the old star fallback.
        return <NoteIcon key={index} size={size} className="inline-block shrink-0 align-[-0.15em]" />;
      })}
    </span>
  );
}
