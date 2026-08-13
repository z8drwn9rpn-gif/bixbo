from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# React helpers for detecting scale children inside Field labels.
s = s.replace(
    'import { createContext, useContext, useState, useMemo, useRef, useEffect, type ReactNode } from "react";',
    'import { Children, createContext, isValidElement, useContext, useState, useMemo, useRef, useEffect, type ReactNode } from "react";',
    1,
)

# Remove slider import: the main pain scale becomes the same compact integer row as the other scales.
s = s.replace('import { Slider } from "@/components/ui/slider";\n', '', 1)

old_field = '''function Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const fieldIdByLabel: Record<string, string> = { "Pain scale": "score", "Where does it hurt?": "parts", "How does it hurt?": "quality", "Other symptoms": "symptoms", "Intensity": "intensity", "Type": "types", "Location": "location", "Triggers": "triggers", "What helped?": "helped", "Bleeding": "flow", "Cramp pain": "cramps", "Discharge (optional)": "discharge", "Duration (minutes)": "minutes", "Intensity (RPE)": "rpe", "How you feel": "feel", "Urinary": "urinary" };
  const fieldId = schemaFieldId ?? fieldIdByLabel[label];
  const configuredField = schema && fieldId ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;
  const dynamicSuffix = fieldId === "intensity" && label.startsWith("Intensity ") ? label.slice("Intensity".length) : "";
  const displayLabel = configuredField
    ? `${configuredField.label}${dynamicSuffix}`
    : (schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label);
  // Intentionally a <div>, not <label>. Wrapping chip/button groups in <label>
  // caused stray click activations on the first focusable descendant, which
  // manifested as chips getting "auto-selected" in the Pain wizard.
  return (
    <>
      <InlineAdminCustomFields anchorFieldId={fieldId} />
      <div className={configuredField?.enabled === false ? "hidden" : "block"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={fieldId || undefined}>
        <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>
        <div className="mt-1">{children}</div>
      </div>
    </>
  );
}
'''
new_field = '''type ScaleInfoChildProps = {
  descriptions?: Record<number, string>;
  legendTitle?: string;
  value?: number;
  max?: number;
  from?: number;
};

function normalizeLogScaleRange(from: number, max: number) {
  // BIXBO log scales are intentionally integer-only and start at 1.
  // Historical 0 values remain readable/editable in stored data, but new choices are 1–5 or 1–10.
  if (max === 5 || max === 10) return { from: 1, max };
  return { from, max };
}

function Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const [scaleInfoOpen, setScaleInfoOpen] = useState(false);
  const fieldIdByLabel: Record<string, string> = { "Pain scale": "score", "Where does it hurt?": "parts", "How does it hurt?": "quality", "Other symptoms": "symptoms", "Intensity": "intensity", "Type": "types", "Location": "location", "Triggers": "triggers", "What helped?": "helped", "Bleeding": "flow", "Cramp pain": "cramps", "Discharge (optional)": "discharge", "Duration (minutes)": "minutes", "Intensity (RPE)": "rpe", "How you feel": "feel", "Urinary": "urinary" };
  const fieldId = schemaFieldId ?? fieldIdByLabel[label];
  const configuredField = schema && fieldId ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;
  const dynamicSuffix = fieldId === "intensity" && label.startsWith("Intensity ") ? label.slice("Intensity".length) : "";
  const displayLabel = configuredField
    ? `${configuredField.label}${dynamicSuffix}`
    : (schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label);

  const scaleChild = Children.toArray(children).find((child) => {
    if (!isValidElement(child)) return false;
    const props = child.props as ScaleInfoChildProps;
    return Boolean(props.descriptions && props.max != null);
  });
  const scaleProps = isValidElement(scaleChild) ? (scaleChild.props as ScaleInfoChildProps) : undefined;
  const infoRange = scaleProps?.max != null
    ? normalizeLogScaleRange(scaleProps.from ?? 1, scaleProps.max)
    : undefined;

  // Intentionally a <div>, not <label>. Wrapping chip/button groups in <label>
  // caused stray click activations on the first focusable descendant, which
  // manifested as chips getting "auto-selected" in the Pain wizard.
  return (
    <>
      <InlineAdminCustomFields anchorFieldId={fieldId} />
      <div className={configuredField?.enabled === false ? "hidden" : "block"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={fieldId || undefined}>
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
          <ScaleLegend
            max={infoRange.max}
            from={infoRange.from}
            descriptions={scaleProps.descriptions}
            value={scaleProps.value}
            title={scaleProps.legendTitle ?? `${displayLabel} scale`}
          />
        ) : null}
      </div>
    </>
  );
}
'''
if old_field not in s:
    raise SystemExit('Field block not found')
s = s.replace(old_field, new_field, 1)

# IntensityScale: integer-only, 1–5/1–10, always one row for standard health scales,
# and descriptions live behind the Field info button rather than taking permanent vertical space.
old_effective = '''  const effective = schema && schemaFieldId ? registryFieldScale(schema.data, schema.featureId, schemaFieldId, { min: from, max, step }) : { min: from, max, step };
  const effectiveFrom = effective.min;
  const effectiveMax = effective.max;
  const effectiveStep = effective.step;
'''
new_effective = '''  const effective = schema && schemaFieldId ? registryFieldScale(schema.data, schema.featureId, schemaFieldId, { min: from, max, step }) : { min: from, max, step };
  const normalizedRange = normalizeLogScaleRange(effective.min, effective.max);
  const effectiveFrom = normalizedRange.from;
  const effectiveMax = normalizedRange.max;
  const effectiveStep = effectiveMax === 5 || effectiveMax === 10 ? 1 : effective.step;
'''
if old_effective not in s:
    raise SystemExit('IntensityScale effective range block not found')
s = s.replace(old_effective, new_effective, 1)

old_row = '''        className={
          compactSingleRow
            ? "flex flex-nowrap items-center justify-center gap-0.5 px-0"
            : "flex flex-wrap justify-center gap-1.5 px-1"
        }
'''
new_row = '''        className={
          compactSingleRow || ((effectiveMax === 5 || effectiveMax === 10) && effectiveStep === 1)
            ? "flex flex-nowrap items-center justify-center gap-0.5 px-0"
            : "flex flex-wrap justify-center gap-1.5 px-1"
        }
'''
if old_row not in s:
    raise SystemExit('IntensityScale row class block not found')
s = s.replace(old_row, new_row, 1)

old_button_size = '''                compactSingleRow ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]"
'''
new_button_size = '''                compactSingleRow || ((effectiveMax === 5 || effectiveMax === 10) && effectiveStep === 1) ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]"
'''
if old_button_size not in s:
    raise SystemExit('IntensityScale button size block not found')
s = s.replace(old_button_size, new_button_size, 1)

# Remove permanent selected description + full legend from every IntensityScale.
old_desc_legend = '''      {descriptions && value >= effectiveFrom && selectedDescription && (
        <div className="mt-2 rounded-lg bg-tint px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
          <span className="font-semibold">
            {t("Level")} {Number.isInteger(value) ? value : value.toFixed(1)}:
          </span>{" "}
          {t(selectedDescription)}
        </div>
      )}

      {descriptions && legendTitle && (
        <ScaleLegend
          max={effectiveMax}
          from={effectiveFrom}
          descriptions={descriptions}
          value={value}
          title={legendTitle}
        />
      )}
'''
if old_desc_legend not in s:
    raise SystemExit('IntensityScale permanent description/legend block not found')
s = s.replace(old_desc_legend, '', 1)

# Remove now-unused selected description helpers in IntensityScale.
s = s.replace('  const roundedValue = Math.round(value);\n  const selectedDescription = descriptions?.[roundedValue];\n\n', '', 1)

# Pressure intensity gets the same info treatment as the other scales.
old_pressure = '''                  max={10}
                  from={0}
                />
'''
new_pressure = '''                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "pain")}
                  legendTitle="Pressure intensity scale"
                  compactSingleRow
                />
'''
if old_pressure not in s:
    raise SystemExit('Pressure intensity scale block not found')
s = s.replace(old_pressure, new_pressure, 1)

# Main Pain scale: 1–10 integers in one row, no slider, legend behind an info button.
s = s.replace('  const [score, setScore] = useState(initialEntry?.score ?? 0);', '  const [score, setScore] = useState(initialEntry?.score ?? 1);', 1)

# Add local info toggle for the standalone Pain score step.
anchor = '  const [step, setStep] = useState(0);\n'
if anchor not in s:
    raise SystemExit('Pain step state anchor not found')
s = s.replace(anchor, anchor + '  const [painScaleInfoOpen, setPainScaleInfoOpen] = useState(false);\n', 1)

old_main_scale = '''          <p className="text-center font-medium">{t(getScaleDesc(data, "pain")[Math.round(score)])}</p>
          <div className="w-full px-4">
            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 px-4">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                title={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}
                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${
                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </button>
            ))}
          </div>
          <div className="w-full px-2">
            <ScaleLegend
              max={10}
              from={0}
              descriptions={getScaleDesc(data, "pain")}
              value={Math.round(score)}
              title={t("Pain scale (Mankosky)")}
            />
          </div>
'''
new_main_scale = '''          <div className="flex items-center justify-center gap-1.5">
            <p className="text-center text-xs font-medium text-muted-foreground">{t("Pain scale")}</p>
            <button
              type="button"
              onClick={() => setPainScaleInfoOpen((open) => !open)}
              aria-label={t("Pain scale information")}
              aria-expanded={painScaleInfoOpen}
              className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[10px] font-bold leading-none text-primary ring-1 ring-primary/25"
            >
              i
            </button>
          </div>
          <div className="flex w-full flex-nowrap items-center justify-center gap-0.5 px-0">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                title={`${n} — ${t(getScaleDesc(data, "pain")[n])}`}
                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[n])}`}
                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${
                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {n}
              </button>
            ))}
          </div>
          {painScaleInfoOpen ? (
            <div className="w-full px-2">
              <ScaleLegend
                max={10}
                from={1}
                descriptions={getScaleDesc(data, "pain")}
                value={Math.round(score)}
                title={t("Pain scale (Mankosky)")}
              />
            </div>
          ) : null}
'''
if old_main_scale not in s:
    raise SystemExit('Main pain scale block not found')
s = s.replace(old_main_scale, new_main_scale, 1)

p.write_text(s)
