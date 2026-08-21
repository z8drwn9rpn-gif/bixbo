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

function ExtraPatternIcon({ emoji, size = 20, className }: { emoji: string; size?: number; className?: string }) {
  return <Ico e={emoji} size={size} className={className} />;
}

function HeadacheBrainIcon({ size = 20, className, ...rest }: IconProps) {
  const gradientId = `bixbo-brain-${String(size).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const shineId = `${gradientId}-shine`;
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
      <defs>
        <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(23 18) rotate(48) scale(46 43)">
          <stop offset="0" stopColor="#FFD9E8" />
          <stop offset="0.35" stopColor="#F7A7C8" />
          <stop offset="0.72" stopColor="#E879A9" />
          <stop offset="1" stopColor="#C94F82" />
        </radialGradient>
        <linearGradient id={shineId} x1="19" y1="13" x2="45" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.62" />
          <stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="1" stopColor="#8A2D59" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="15" ry="3.2" fill="#6D2846" opacity="0.18" />
      <path
        d="M25 12.5c-7.2 0-12.2 5.1-12.2 11.4 0 3.1 1.3 5.7 3.4 7.7-3 2.1-4.3 5.3-3.4 8.5 1.2 4.8 5.1 8 10.1 8 2.3 5 8.1 7.1 13.1 4.1 5 3 10.8.9 13.1-4.1 5 0 8.9-3.2 10.1-8 .9-3.2-.4-6.4-3.4-8.5 2.1-2 3.4-4.6 3.4-7.7 0-6.3-5-11.4-12.2-11.4-3.1-4.1-8.2-5.1-12.3-2-4.1-3.1-9.2-2.1-12.1 2Z"
        fill={`url(#${gradientId})`}
        stroke="#A83D6F"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M31.5 15.5v34M23 21c4.2 1.7 5.6 5.1 3 9.4M41 20c-4.1 2-5.3 5.1-2.7 9.1M20.5 38.5c4.3-3.5 8.5-2.3 11 1.1M43.5 37.7c-4.2-3.2-8.1-2-10.3 1.3M18.2 29.8c3-1.3 5.5-.8 7.4 1.2M45.7 29.1c-3.3-1.1-5.8-.3-7.5 1.9"
        stroke="#A33B6A"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path
        d="M18.5 20.2c2.3-4 6.9-5.1 10.2-3.3M40.3 15.7c3.8-1 7.7.8 9.3 4.1"
        stroke={`url(#${shineId})`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="22.5" cy="18" rx="5.2" ry="2.8" transform="rotate(-24 22.5 18)" fill="#FFFFFF" opacity="0.32" />
      <path d="M45.7 43c-1.7 3.1-4.4 5-7.5 5.8" stroke="#B94F7D" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}
function PressureBurstIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="💢" size={size} className={className} />; }
function PeriodBloodDropIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="🩸" size={size} className={className} />; }
function HotFlashThermometerIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="🌡️" size={size} className={className} />; }
function SymptomsSunIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="🔅" size={size} className={className} />; }
function PcosSunflowerIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="🌻" size={size} className={className} />; }
function TetanyLightningIcon({ size = 20, className }: IconProps) { return <ExtraPatternIcon emoji="⚡" size={size} className={className} />; }

const ORIGINAL_3D_ICONS = new Set<IconComponent>([
  ChiliIcon,
  PoopIcon,
  BlueberryIcon,
  FlameIcon,
  SleepIcon,
  HeartIcon,
  SparkleIcon,
  WorkoutShoeIcon,
  HeadacheBrainIcon,
]);

export function normalizeBixboEmoji(value: string) {
  return value.replace(/\uFE0F/g, "").replace(/\p{Emoji_Modifier}/gu, "");
}

export function resolveBixboIcon(input: { emoji?: string; label?: string; fallback?: IconComponent }): IconComponent | undefined {
  const { emoji, label, fallback } = input;

  if (emoji) {
    const normalized = normalizeBixboEmoji(emoji);

    // Exact BIXBO health/pattern icons always win over generic/picker fallbacks.
    if (normalized === "🌶") return ChiliIcon;
    if (normalized === "💩") return PoopIcon;
    if (normalized === "🫐") return BlueberryIcon;
    if (normalized === "🩸") return PeriodBloodDropIcon;
    if (normalized === "🔥") return FlameIcon;
    if (normalized === "🌙") return SleepIcon;
    if (normalized === "😈") return DevilIcon;
    if (normalized === "❤" || normalized === "💗") return HeartIcon;
    if (normalized === "✨") return SparkleIcon;
    if (normalized === "👟") return WorkoutShoeIcon;
    if (normalized === "🧠") return HeadacheBrainIcon;
    if (normalized === "💢") return PressureBurstIcon;
    if (normalized === "🌡") return HotFlashThermometerIcon;
    if (normalized === "🔅") return SymptomsSunIcon;
    if (normalized === "🌻") return PcosSunflowerIcon;
    if (normalized === "⚡") return TetanyLightningIcon;

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
    const normalizedLabel = label.trim().toLowerCase();
    if (normalizedLabel.includes("headache")) return HeadacheBrainIcon;
    if (normalizedLabel.includes("pressure")) return PressureBurstIcon;
    if (normalizedLabel.includes("period") || normalizedLabel.includes("flow") || normalizedLabel.includes("bleed")) return PeriodBloodDropIcon;
    if (normalizedLabel.includes("hot flash")) return HotFlashThermometerIcon;
    if (normalizedLabel === "symptoms" || normalizedLabel.includes("symptom summary")) return SymptomsSunIcon;
    if (normalizedLabel.includes("pcos")) return PcosSunflowerIcon;
    if (normalizedLabel.includes("tetany")) return TetanyLightningIcon;
    if (normalizedLabel.includes("panic")) return SparkleIcon;
    if (normalizedLabel.includes("workout") || normalizedLabel.includes("exercise")) return WorkoutShoeIcon;
    if (normalizedLabel.includes("histamine")) return ChiliIcon;

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