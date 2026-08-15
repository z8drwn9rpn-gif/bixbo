import type { ComponentType, SVGProps } from "react";
import { Ico, NoteIcon } from "./BixboExtraIcons";
import { ChiliIcon, PoopIcon, SleepIcon, HeartIcon, SparkleIcon, BlueberryIcon, FlameIcon } from "./BixboIcons";
import { DevilIcon } from "./BixboSpecialEmojiIcons";
import { semanticIconForLabel } from "./BixboFoodIcons";
import { appEmojiIcon } from "./BixboAppEmojiIcons";
import { pickerEmojiIcon } from "./BixboPickerEmojiIcons";
import { specificEmojiIcon } from "./BixboSpecificEmojiIcons";
import { keyboardEmojiIcon } from "./BixboKeyboardEmojiIcons";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
type IconComponent = ComponentType<IconProps>;

const FOOD_EMOJI_LABELS: Record<string, string> = {
  "🍎": "apple", "🍏": "apple", "🍌": "banana", "🍓": "berry", "🍇": "berries",
  "🍞": "bread", "🥖": "bread", "🥯": "bagel", "🍝": "pasta", "🍚": "rice", "🍙": "rice",
  "🍕": "pizza", "🥚": "egg", "🍳": "egg", "🧀": "cheese", "🐟": "fish", "🐠": "fish", "🍣": "fish",
  "🥩": "meat", "🍗": "chicken", "🍖": "meat", "🥗": "salad", "🥬": "salad", "🍲": "soup", "🥣": "soup",
  "🥛": "milk", "☕": "coffee", "🍵": "tea", "💧": "water", "🚰": "water", "🥪": "sandwich", "🌯": "wrap",
  "🍔": "burger", "🍰": "cake", "🧁": "cake", "🍩": "dessert", "🍪": "dessert",
};

export function normalizeBixboEmoji(value: string) {
  return value.replace(/\uFE0F/g, "").replace(/\p{Emoji_Modifier}/gu, "");
}

export function resolveBixboIcon(input: { emoji?: string; label?: string; fallback?: IconComponent }): IconComponent | undefined {
  const { emoji, label, fallback } = input;

  if (emoji) {
    const normalized = normalizeBixboEmoji(emoji);

    // Exact original BIXBO identity icons always win over generic/picker fallbacks.
    if (normalized === "🌶") return ChiliIcon;
    if (normalized === "💩") return PoopIcon;
    if (normalized === "🫐") return BlueberryIcon;
    if (normalized === "🔥") return FlameIcon;
    if (normalized === "🌙") return SleepIcon;
    if (normalized === "😈") return DevilIcon;
    if (normalized === "❤" || normalized === "💗") return HeartIcon;
    if (normalized === "✨") return SparkleIcon;

    const foodLabel = FOOD_EMOJI_LABELS[normalized];
    if (foodLabel) {
      const food = semanticIconForLabel(foodLabel);
      if (food) return food;
    }

    const appSpecific = appEmojiIcon(emoji);
    if (appSpecific) return appSpecific;

    const pickerSpecific = pickerEmojiIcon(emoji);
    if (pickerSpecific) return pickerSpecific;

    const specific = specificEmojiIcon(emoji);
    if (specific) return specific;

    const keyboard = keyboardEmojiIcon(emoji);
    if (keyboard) return keyboard;
  }

  if (label) {
    const semantic = semanticIconForLabel(label);
    if (semantic) return semantic;
  }

  return fallback;
}

export function BixboIcon({
  emoji,
  label,
  name,
  size = 20,
  className,
  fallback = "note",
}: {
  emoji?: string;
  label?: string;
  name?: Parameters<typeof Ico>[0]["name"];
  size?: number;
  className?: string;
  fallback?: "note" | "none";
}) {
  if (name) return <Ico name={name} size={size} className={className} />;

  const Resolved = resolveBixboIcon({ emoji, label });
  if (Resolved) return <Resolved size={size} className={className} />;

  if (fallback === "none") return null;
  return <NoteIcon size={size} className={className} />;
}
