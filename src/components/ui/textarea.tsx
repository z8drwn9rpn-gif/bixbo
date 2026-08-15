import * as React from "react";

import { BixboIcon, resolveBixboIcon } from "@/components/icons/BixboIcon";
import { BixboInlinePicker } from "@/components/icons/BixboInlinePicker";
import {
  bixboNativeGlyphForEmoji,
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

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, value, defaultValue, onChange, onScroll, onFocus, onSelect, ...props }, forwardedRef) => {
    const initialValue = normalizeBixboText(asText(defaultValue));
    const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const mirrorRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const caretRef = React.useRef<{ start: number; end: number } | null>(null);
    const controlled = value !== undefined;
    const canonicalValue = normalizeBixboText(controlled ? asText(value) : uncontrolledValue);
    const nativeValue = encodeBixboNativeText(canonicalValue);

    const rememberCaret = React.useCallback(() => {
      const node = textareaRef.current;
      if (!node) return;
      const start = node.selectionStart ?? node.value.length;
      const end = node.selectionEnd ?? start;
      caretRef.current = { start, end };
    }, []);

    const openPicker = React.useCallback(() => {
      const node = textareaRef.current;
      if (!node) return;
      if (!caretRef.current) rememberCaret();
      node.blur();
      setPickerOpen(true);
    }, [rememberCaret]);

    const chooseIcon = React.useCallback((emoji: string) => {
      const node = textareaRef.current;
      if (!node) return;

      const saved = caretRef.current;
      const start = saved?.start ?? node.selectionStart ?? node.value.length;
      const end = saved?.end ?? node.selectionEnd ?? start;
      const insertion = bixboNativeGlyphForEmoji(emoji) ?? bixboNativeGlyphForEmoji("⭐") ?? "";

      node.setRangeText(insertion, start, end, "end");
      const nextCaret = start + insertion.length;
      caretRef.current = { start: nextCaret, end: nextCaret };

      node.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: emoji,
        }),
      );

      setPickerOpen(false);
    }, []);

    return (
      <div className="group relative w-full">
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            assignRef(forwardedRef, node);
          }}
          data-bixbo-rich-text="true"
          value={controlled ? nativeValue : undefined}
          defaultValue={controlled ? undefined : encodeBixboNativeText(initialValue)}
          onFocus={(event) => {
            caretRef.current = {
              start: event.currentTarget.selectionStart ?? event.currentTarget.value.length,
              end: event.currentTarget.selectionEnd ?? event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            };
            onFocus?.(event);
          }}
          onSelect={(event) => {
            caretRef.current = {
              start: event.currentTarget.selectionStart ?? event.currentTarget.value.length,
              end: event.currentTarget.selectionEnd ?? event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            };
            onSelect?.(event);
          }}
          onChange={(event) => {
            const node = event.currentTarget;
            const rawNative = node.value;
            const rawStart = node.selectionStart ?? rawNative.length;
            const rawEnd = node.selectionEnd ?? rawStart;

            const canonical = normalizeBixboText(decodeBixboNativeText(rawNative));
            const encoded = encodeBixboNativeText(canonical);
            const encodedStart = encodeBixboNativeText(
              normalizeBixboText(decodeBixboNativeText(rawNative.slice(0, rawStart))),
            ).length;
            const encodedEnd = encodeBixboNativeText(
              normalizeBixboText(decodeBixboNativeText(rawNative.slice(0, rawEnd))),
            ).length;

            caretRef.current = { start: encodedStart, end: encodedEnd };
            if (!controlled) setUncontrolledValue(canonical);

            node.value = encoded;
            try {
              node.setSelectionRange(encodedStart, encodedEnd);
            } catch {
              // Some browser/input states do not expose a mutable text selection.
            }

            if (onChange) {
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
            "relative z-10 flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2.5 pr-14 text-base leading-normal text-transparent caret-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
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
            className="pointer-events-none absolute inset-[1px] z-20 overflow-hidden rounded-[calc(0.75rem-1px)] px-3 py-2.5 pr-14 text-base leading-normal text-foreground whitespace-pre-wrap break-words md:text-sm"
          >
            <BixboTextareaValue value={canonicalValue} />
          </div>
        ) : null}

        <button
          type="button"
          data-bixbo-icon-trigger
          onPointerDown={rememberCaret}
          onTouchStart={rememberCaret}
          onClick={openPicker}
          className="pointer-events-none absolute right-2 top-2 z-30 grid h-11 w-11 touch-manipulation select-none place-items-center rounded-full border border-border/70 bg-background opacity-0 shadow-lg transition-[opacity,transform] active:scale-95 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          aria-label="BIXBO icons"
          title="BIXBO icons"
        >
          <BixboIcon emoji="✨" size={23} />
        </button>

        <BixboInlinePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onChoose={chooseIcon}
        />
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
