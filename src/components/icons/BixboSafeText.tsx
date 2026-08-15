import { Fragment } from "react";
import { BixboIcon, resolveBixboIcon } from "./BixboIcon";

// Covers pictographic emoji, ZWJ families/professions, skin tones, flags and keycaps.
const EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
const HAS_EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic})/u;

export function BixboSafeText({ text, size = 16, className }: { text: string; size?: number; className?: string }) {
  if (!HAS_EMOJI_RE.test(text)) {
    const Semantic = resolveBixboIcon({ label: text });
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
        return <BixboIcon key={index} emoji={part} size={size} className="inline-block shrink-0 align-[-0.15em]" />;
      })}
    </span>
  );
}
