import * as React from "react";

import { BixboIcon, resolveBixboIcon } from "@/components/icons/BixboIcon";
import {
  decodeBixboNativeText,
  encodeBixboNativeText,
  normalizeBixboText,
  splitBixboGraphemes,
} from "@/components/icons/BixboTextGlyphs";
import { cn } from "@/lib/utils";

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function asText(value: React.ComponentProps<"textarea">["value"] | React.ComponentProps<"textarea">["defaultValue"]) {
  if (value == null) return "";
  return Array.isArray(value) ? value.join("\n") : String(value);
}

function BixboTextareaValue({ value }: { value: string }) {
  return (
    <>
      {splitBixboGraphemes(value).map((part, index) => {
        if (!EMOJI_RE.test(part)) return <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;

        const supported = Boolean(resolveBixboIcon({ emoji: part }));
        const iconEmoji = supported ? part : "⭐";
        return (
          <span
            key={`${index}-${part}`}
            className="relative mx-[0.03em] inline-flex h-[1.2em] w-[1.2em] translate-y-[0.16em] items-center justify-center rounded-[0.2em] bg-background align-baseline"
            data-bixbo-rendered-emoji={part}
          >
            <BixboIcon emoji={iconEmoji} size={19} />
          </span>
        );
      })}
    </>
  );
}

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, value, defaultValue, onChange, onScroll, ...props }, ref) => {
    const initialValue = normalizeBixboText(asText(defaultValue));
    const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue);
    const mirrorRef = React.useRef<HTMLDivElement>(null);
    const controlled = value !== undefined;
    const canonicalValue = normalizeBixboText(controlled ? asText(value) : uncontrolledValue);
    const nativeValue = encodeBixboNativeText(canonicalValue);

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          data-bixbo-rich-text="true"
          value={controlled ? nativeValue : undefined}
          defaultValue={controlled ? undefined : encodeBixboNativeText(initialValue)}
          onChange={(event) => {
            const node = event.currentTarget;
            const rawNative = node.value;
            const rawStart = node.selectionStart ?? rawNative.length;
            const rawEnd = node.selectionEnd ?? rawStart;

            const canonical = normalizeBixboText(decodeBixboNativeText(rawNative));
            const encoded = encodeBixboNativeText(canonical);

            // Map the native selection to the normalized one-character BIXBO glyph
            // positions before replacing any emoji Safari may just have inserted.
            const encodedStart = encodeBixboNativeText(
              normalizeBixboText(decodeBixboNativeText(rawNative.slice(0, rawStart))),
            ).length;
            const encodedEnd = encodeBixboNativeText(
              normalizeBixboText(decodeBixboNativeText(rawNative.slice(0, rawEnd))),
            ).length;

            if (!controlled) setUncontrolledValue(canonical);

            // Crucial on iOS: the DOM textarea itself never keeps a Unicode emoji.
            // Known BIXBO emoji become one private-use glyph; unknown emoji become
            // the BIXBO star. The visible layer above renders the real SVG icons.
            node.value = encoded;
            try {
              node.setSelectionRange(encodedStart, encodedEnd);
            } catch {
              // Some browser/input states do not expose a mutable text selection.
            }

            if (onChange) {
              // Existing form code expects e.target.value to contain the normal
              // persisted text (including normal emoji values). Expose that only
              // synchronously to the React handler, then immediately restore the
              // native-safe glyph string before the browser can paint it.
              node.value = canonical;
              onChange(event);
              node.value = encoded;
              try {
                node.setSelectionRange(encodedStart, encodedEnd);
              } catch {
                // See note above.
              }
            }
          }}
          onScroll={(event) => {
            if (mirrorRef.current) {
              mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
              mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
            onScroll?.(event);
          }}
          className={cn(
            "relative z-10 flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-normal text-transparent caret-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
            "[-webkit-text-fill-color:transparent] placeholder:[-webkit-text-fill-color:var(--muted-foreground)] placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
            "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
            "resize-y md:text-sm",
            className,
          )}
          {...props}
        />

        {canonicalValue ? (
          <div
            ref={mirrorRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-[1px] z-20 overflow-hidden rounded-[calc(0.75rem-1px)] px-3 py-2.5 text-base leading-normal text-foreground whitespace-pre-wrap break-words md:text-sm"
          >
            <BixboTextareaValue value={canonicalValue} />
          </div>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
