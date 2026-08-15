import * as React from "react";

import { BixboIcon, resolveBixboIcon } from "@/components/icons/BixboIcon";
import { cn } from "@/lib/utils";

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function graphemes(value: string) {
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

function BixboTextareaValue({ value }: { value: string }) {
  return (
    <>
      {graphemes(value).map((part, index) => {
        if (!EMOJI_RE.test(part)) return <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;

        // Never let the device emoji font define BIXBO's visual language. Known
        // emoji resolve to their BIXBO SVG; unknown emoji use the BIXBO star.
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
    const initialValue = defaultValue == null
      ? ""
      : Array.isArray(defaultValue)
        ? defaultValue.join("\n")
        : String(defaultValue);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue);
    const mirrorRef = React.useRef<HTMLDivElement>(null);
    const controlled = value !== undefined;
    const visibleValue = controlled
      ? Array.isArray(value)
        ? value.join("\n")
        : String(value ?? "")
      : uncontrolledValue;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => {
            if (!controlled) setUncontrolledValue(event.target.value);
            onChange?.(event);
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

        {visibleValue ? (
          <div
            ref={mirrorRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-[1px] z-20 overflow-hidden rounded-[calc(0.75rem-1px)] px-3 py-2.5 text-base leading-normal text-foreground whitespace-pre-wrap break-words md:text-sm"
          >
            <BixboTextareaValue value={visibleValue} />
          </div>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
