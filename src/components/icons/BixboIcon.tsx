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

/**
 * Shared finish for the newer/flatter icon families.
 * The original hand-built 3D identity icons already contain their own radial
 * gradients/highlights/shadows, so we intentionally leave those untouched.
 */
const VIVID_ICON_CLASS =
  "[filter:saturate(1.38)_contrast(1.08)_brightness(1.03)_drop-shadow(0_2px_1.5px_rgb(0_0_0_/_0.16))_drop-shadow(0_-1px_0.8px_rgb(255_255_255_/_0.14))]";
const withVivid = (className?: string) => `${VIVID_ICON_CLASS}${className ? ` ${className}` : ""}`;

function WorkoutShoeIcon({ size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />
      <path
        d="M13 34c4-1 8-4 11-10l3-6 8 9c4 4 8 6 14 8l6 2c3 1 5 4 4 7-1 4-5 7-10 7H18c-7 0-11-3-11-8 0-4 2-7 6-9Z"
        fill="#9fb45f"
        stroke="#66793a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 43h48c0 5-4 8-10 8H19c-6 0-10-3-10-8Z"
        fill="#f1edd7"
        stroke="#8b916f"
        strokeWidth="2"
      />
      <path d="M27 27l9 8M23 31l9 8" stroke="#f7f4e8" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 37c5-1 9-3 12-6" stroke="#dce6ae" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="24" cy="23" rx="4" ry="2.2" transform="rotate(-28 24 23)" fill="#fff" opacity="0.35" />
    </svg>
  );
}

const ORIGINAL_3D_ICONS = new Set<IconComponent>([
  ChiliIcon,
  PoopIcon,
  BlueberryIcon,
  FlameIcon,
  SleepIcon,
  HeartIcon,
  SparkleIcon,
  WorkoutShoeIcon,
]);

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
    if (normalized === "👟") return WorkoutShoeIcon;

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
  effects = "vivid",
}: {
  emoji?: string;
  label?: string;
  name?: Parameters<typeof Ico>[0]["name"];
  size?: number;
  className?: string;
  fallback?: "note" | "none";
  effects?: "vivid" | "stable";
}) {
  const decorate = (resolvedClassName?: string) => effects === "stable" ? resolvedClassName : withVivid(resolvedClassName);

  if (name) return <Ico name={name} size={size} className={decorate(className)} />;

  const Resolved = resolveBixboIcon({ emoji, label });
  if (Resolved) {
    const resolvedClassName = ORIGINAL_3D_ICONS.has(Resolved) ? className : decorate(className);
    return <Resolved size={size} className={resolvedClassName} />;
  }

  if (fallback === "none") return null;
  return <NoteIcon size={size} className={decorate(className)} />;
}
