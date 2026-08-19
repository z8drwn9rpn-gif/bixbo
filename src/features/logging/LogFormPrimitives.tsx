import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { markScaleLegendOpen } from "@/lib/scaleLegendOverlay";
import { useI18n } from "@/hooks/useI18n";
import { TrText } from "@/features/logging/TrText";
import { SheetFooter } from "@/components/ui/sheet";
import { IcoText } from "@/components/icons/BixboExtraIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Pencil } from "@/components/icons/BixboExtraIcons";
import { painColor, type BixboData } from "@/lib/storage";

export type UpdateFn = (u: (d: BixboData) => BixboData) => void;

export type ScaleInfoChildProps = {
  descriptions?: Record<number, string>;
  legendTitle?: string;
  value?: number;
  max?: number;
  from?: number;
};

export function normalizeLogScaleRange(from: number, max: number) {
  if (max === 5 || max === 10) return { from: 1, max };
  return { from, max };
}

export function Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {
  const { t } = useI18n();
  const [scaleInfoOpen, setScaleInfoOpen] = useState(false);
  const displayLabel = label;

  useEffect(() => {
    if (!scaleInfoOpen) return;
    return markScaleLegendOpen();
  }, [scaleInfoOpen]);

  const scaleChild = Children.toArray(children).find((child) => {
    if (!isValidElement(child)) return false;
    const props = child.props as ScaleInfoChildProps;
    return Boolean(props.descriptions && props.max != null);
  });
  const scaleProps = isValidElement(scaleChild) ? (scaleChild.props as ScaleInfoChildProps) : undefined;
  const infoRange = scaleProps?.max != null
    ? normalizeLogScaleRange(scaleProps.from ?? 1, scaleProps.max)
    : undefined;

  return (
    <div className="block" data-bixbo-log-field-id={schemaFieldId || undefined}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>
        {scaleProps?.descriptions && infoRange ? (
          <button
            type="button"
            onClick={() => setScaleInfoOpen((open) => !open)}
            aria-label={t(`Scale information for ${displayLabel}`)}
            aria-expanded={scaleInfoOpen}
            className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold leading-none text-primary ring-1 ring-primary/25 transition hover:bg-primary/20"
          >
            i
          </button>
        ) : null}
      </div>
      <div className="mt-1">{children}</div>
      {scaleInfoOpen && scaleProps?.descriptions && infoRange ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setScaleInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(scaleProps.legendTitle ?? `${displayLabel} scale`)}
            className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-base font-bold text-primary">i</span>
                <h3 className="font-serif text-xl font-semibold">{t(scaleProps.legendTitle ?? `${displayLabel} scale`)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setScaleInfoOpen(false)}
                aria-label={t("Close")}
                className="grid h-10 w-10 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ScaleLegend
              max={infoRange.max}
              from={infoRange.from}
              descriptions={scaleProps.descriptions}
              value={scaleProps.value}
              title={scaleProps.legendTitle ?? `${displayLabel} scale`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RegistryFieldBlock({ fieldId, children }: { fieldId: string; children: ReactNode }) {
  return (
    <div className="block" data-bixbo-log-field-id={fieldId}>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
  title?: string;
}) {
  const { t } = useI18n();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerMoved = useRef(false);
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        pointerMoved.current = false;
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "touch" || !pointerStart.current) return;
        const dx = event.clientX - pointerStart.current.x;
        const dy = event.clientY - pointerStart.current.y;
        if (Math.hypot(dx, dy) > 8) pointerMoved.current = true;
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "touch" && pointerStart.current) {
          const dx = event.clientX - pointerStart.current.x;
          const dy = event.clientY - pointerStart.current.y;
          if (Math.hypot(dx, dy) > 8) pointerMoved.current = true;
        }
        pointerStart.current = null;
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
        pointerMoved.current = true;
      }}
      onClick={(event) => {
        if (event.detail !== 0 && pointerMoved.current) {
          pointerMoved.current = false;
          event.preventDefault();
          return;
        }
        pointerMoved.current = false;
        onClick();
      }}
      title={title}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "scale-[1.03] text-white shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
          : "bg-tint text-foreground ring-1 ring-border"
      }`}
      style={active && color ? { background: color } : active ? { background: "var(--primary)" } : undefined}
    >
      {typeof children === "string" ? <SemanticIcoText text={t(children)} size={14} /> : children}
    </button>
  );
}

export function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <SheetFooter
      data-bixbo-log-save-bar
      style={{ top: "var(--bixbo-log-date-offset, 0px)" }}
      className="sticky z-30 -mx-5 mt-0 flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex min-h-10 min-w-[68px] items-center gap-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="text-sm leading-none">←</span>
        <span>{t("Back")}</span>
      </button>
      <span className="min-w-0 flex-1" aria-hidden="true" />
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span>{t("Save")}</span>
        <span aria-hidden="true" className="text-sm leading-none">✓</span>
      </button>
    </SheetFooter>
  );
}

export function CustomChipList({
  base,
  custom,
  onAddCustom,
  onRemoveCustom,
  onRenameCustom,
  selected,
  onToggle,
  descriptions,
  schemaFieldId,
}: {
  base: string[];
  custom: string[];
  onAddCustom: (v: string) => void;
  onRemoveCustom?: (v: string) => void;
  onRenameCustom?: (oldV: string, newV: string) => void;
  selected: string[];
  onToggle: (v: string) => void;
  descriptions?: Record<string, string>;
  schemaFieldId?: string;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const [infoFor, setInfoFor] = useState<string | null>(null);

  return (
    <div className="relative mt-0" data-bixbo-log-field-id={schemaFieldId || undefined}>
      {adding ? (
        <div className="mb-2 flex items-center gap-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-8 flex-1"
            placeholder={t("Custom…")}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (text.trim()) {
                onAddCustom(text.trim());
                setText("");
                setAdding(false);
              }
            }}
          >
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setText("");
              setAdding(false);
            }}
          >
            <TrText value="Cancel" />
          </Button>
        </div>
      ) : (
        <div className="absolute -top-6 right-0 z-20">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("More options")}
            aria-expanded={menuOpen}
            className="grid h-7 w-9 place-items-center rounded-full text-lg font-bold leading-none text-muted-foreground transition hover:bg-tint hover:text-foreground"
          >
            ⋯
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label={t("Close")}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 min-w-[160px] overflow-hidden rounded-2xl border border-border/70 bg-background p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAdding(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:bg-tint"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("Add custom")}
                </button>
                {(onRenameCustom || onRemoveCustom) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditMode((value) => !value);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:bg-tint"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {editMode ? t("Done") : `${t("Edit")} / ${t("Delete")}`}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {base.map((v) => (
          <span key={v} className="inline-flex items-center gap-0.5">
            <Chip active={selected.includes(v)} onClick={() => onToggle(v)} title={descriptions?.[v] ? t(descriptions[v]) : undefined}>
              {t(v)}
            </Chip>
            {descriptions?.[v] && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoFor(infoFor === v ? null : v);
                }}
                aria-label={`Info ${v}`}
                className="grid h-4 w-4 place-items-center rounded-full bg-tint text-[10px] font-bold text-muted-foreground hover:bg-primary/15 hover:text-primary"
              >
                i
              </button>
            )}
          </span>
        ))}
        {custom.map((v) => (
          <span key={v} className="relative inline-flex items-center">
            <Chip active={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>
            {editMode && onRenameCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = prompt(`${t("Rename")} "${v}" ${t("to")}:`, v);
                  if (next && next.trim() && next.trim() !== v) onRenameCustom(v, next.trim());
                }}
                aria-label={`Rename ${v}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-primary/15 hover:text-primary"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {editMode && onRemoveCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`${t("Remove")} "${v}" ${t("from your custom list?")}`)) onRemoveCustom(v);
                }}
                aria-label={`Remove ${v}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {infoFor && descriptions?.[infoFor] && (
        <div className="mt-2 rounded-lg bg-tint px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
          <span className="font-semibold">{t(infoFor)}:</span> {t(descriptions[infoFor])}
        </div>
      )}
    </div>
  );
}

export const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export const stripEmoji = (v: string) => v.replace(/^(?:\p{Extended_Pictographic}|\u200d|\ufe0f)+\s*/u, "").trim();

export function scaleColor(value: number, from: number, max: number): string {
  const span = Math.max(0.5, max - from);
  const normalized = ((value - from) / span) * 10;
  return painColor(Math.max(0, Math.min(10, normalized)));
}

export function ScaleLegend({
  max,
  descriptions,
  value,
  title,
  from = 0,
}: {
  max: number;
  descriptions: Record<number, string>;
  value?: number;
  title: string;
  from?: number;
}) {
  const { t } = useI18n();
  const items: number[] = [];
  for (let i = Math.ceil(from); i <= max; i++) items.push(i);
  const activeLegendValue = value == null || value < from ? undefined : Math.round(value);

  return (
    <div className="mt-2 rounded-2xl border border-border/60 bg-surface/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(title)}</p>
      <div className="space-y-2.5 text-sm leading-snug">
        {items.map((n) => (
          <div key={n} className="flex items-start gap-2">
            <span
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: scaleColor(n, from, max) }}
            >
              {n}
            </span>
            <span className={activeLegendValue === n ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {t(descriptions[n])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntensityScale({
  value,
  onChange,
  max,
  descriptions,
  legendTitle,
  from = 0,
  compactSingleRow = false,
  step = 0.5,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  descriptions?: Record<number, string>;
  legendTitle?: string;
  from?: number;
  compactSingleRow?: boolean;
  step?: number;
  schemaFieldId?: string;
}) {
  const { t } = useI18n();
  const [standaloneLegendOpen, setStandaloneLegendOpen] = useState(false);
  const normalizedRange = normalizeLogScaleRange(from, max);
  const effectiveFrom = normalizedRange.from;
  const effectiveMax = normalizedRange.max;
  const effectiveStep = effectiveMax === 5 || effectiveMax === 10 ? 1 : step;
  const ownsCrampLegend = legendTitle === "Cramp pain scale" && Boolean(descriptions);
  const nums = Array.from(
    { length: Math.floor((effectiveMax - effectiveFrom) / effectiveStep) + 1 },
    (_, i) => Number((effectiveFrom + i * effectiveStep).toFixed(2)),
  );

  useEffect(() => {
    if (!standaloneLegendOpen) return;
    return markScaleLegendOpen();
  }, [standaloneLegendOpen]);

  return (
    <div className="mt-2 space-y-1.5">
      <div
        className={
          compactSingleRow || ((effectiveMax === 5 || effectiveMax === 10) && effectiveStep === 1)
            ? "flex flex-nowrap items-center justify-center gap-0.5 px-0"
            : "flex flex-wrap justify-center gap-1.5 px-1"
        }
      >
        {nums.map((n) => {
          const active = value === n;
          const description = descriptions?.[Math.round(n)];
          const bg = scaleColor(n, effectiveFrom, effectiveMax);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={description ? `${n} — ${t(description)}` : String(n)}
              aria-label={description ? `${n} — ${t(description)}` : `${t("Intensity")} ${n}`}
              className={`${compactSingleRow || ((effectiveMax === 5 || effectiveMax === 10) && effectiveStep === 1) ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]"} shrink-0 rounded-full font-semibold transition ${active ? "text-white ring-2 ring-foreground" : "text-foreground"}`}
              style={{ background: bg }}
            >
              {Number.isInteger(n) ? n : n.toFixed(1)}
            </button>
          );
        })}
      </div>
      {ownsCrampLegend ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStandaloneLegendOpen((open) => !open)}
            aria-label={t("Cramp pain scale")}
            aria-expanded={standaloneLegendOpen}
            className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[11px] font-bold leading-none text-primary ring-1 ring-primary/25 transition hover:bg-primary/20"
          >
            i
          </button>
        </div>
      ) : null}
      {standaloneLegendOpen && ownsCrampLegend && descriptions ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setStandaloneLegendOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Cramp pain scale")}
            className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-base font-bold text-primary">i</span>
                <h3 className="font-serif text-xl font-semibold">{t("Cramp pain scale")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setStandaloneLegendOpen(false)}
                aria-label={t("Close")}
                className="grid h-10 w-10 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ScaleLegend
              max={effectiveMax}
              from={effectiveFrom}
              descriptions={descriptions}
              value={value}
              title="Cramp pain scale"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DurationField({
  minutes,
  setMinutes,
  ongoing,
  setOngoing,
  schemaFieldId,
}: {
  minutes: string;
  setMinutes: (s: string) => void;
  ongoing: boolean;
  setOngoing: (b: boolean) => void;
  schemaFieldId?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1" data-bixbo-log-field-id={schemaFieldId || undefined}>
      <span className="text-xs font-medium text-muted-foreground">{t("Duration (min)")}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={ongoing ? "" : minutes}
          disabled={ongoing}
          onChange={(e) => setMinutes(e.target.value)}
          className="flex-1"
          placeholder="—"
        />
        <button
          type="button"
          onClick={() => setOngoing(!ongoing)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-border ${ongoing ? "bg-primary text-white" : "bg-tint text-foreground"}`}
        >
          {t("Ongoing")}
        </button>
      </div>
    </div>
  );
}