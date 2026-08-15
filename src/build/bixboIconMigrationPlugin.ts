import type { Plugin } from "vite";

const BIXBO_ICON_IMPORT = 'import { BixboIcon } from "@/components/icons/BixboIcon";';
const BIXBO_SAFE_TEXT_IMPORT = 'import { BixboSafeText } from "@/components/icons/BixboSafeText";';

function ensureImport(code: string, modulePath: string, statement: string) {
  const hasExactImport =
    code.includes(`from "${modulePath}"`) ||
    code.includes(`from '${modulePath}'`) ||
    code.includes(`import("${modulePath}")`) ||
    code.includes(`import('${modulePath}')`);
  if (hasExactImport) return code;
  return `${statement}\n${code}`;
}

function ensureBixboIconImport(code: string) {
  return ensureImport(code, "@/components/icons/BixboIcon", BIXBO_ICON_IMPORT);
}

function ensureBixboSafeTextImport(code: string) {
  return ensureImport(code, "@/components/icons/BixboSafeText", BIXBO_SAFE_TEXT_IMPORT);
}

/**
 * Runtime compatibility transform while emoji strings remain stable data IDs.
 * Every visual emoji surface is routed through the central BIXBO resolver,
 * including legacy Ico, IcoText, SemanticIco and user-entered overview text.
 */
export function bixboIconMigrationPlugin(): Plugin {
  return {
    name: "bixbo-icon-compat",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      const isSourceTsx = normalized.includes("/src/") && normalized.endsWith(".tsx");
      const isIconImplementation = normalized.includes("/src/components/icons/");
      const isTest = normalized.includes("/__tests__/");
      if (!isSourceTsx || isIconImplementation || isTest) return null;

      const isDayOverview = normalized.endsWith("/src/components/home/DayOverview.tsx");
      const isPainWizard = normalized.endsWith("/src/features/logging/PainWizard.tsx");

      let next = code;

      if (next.includes("<Ico e=")) {
        next = ensureBixboIconImport(next).replaceAll("<Ico e=", "<BixboIcon emoji=");
      }

      if (next.includes("<IcoText")) {
        next = ensureBixboSafeTextImport(next)
          .replaceAll("<IcoText", "<BixboSafeText")
          .replaceAll("</IcoText>", "</BixboSafeText>");
      }
      if (next.includes("<SemanticIcoText")) {
        next = ensureBixboSafeTextImport(next)
          .replaceAll("<SemanticIcoText", "<BixboSafeText")
          .replaceAll("</SemanticIcoText>", "</BixboSafeText>");
      }

      if (next.includes("<SemanticIco")) {
        next = ensureBixboIconImport(next)
          .replace(/<SemanticIco\b/g, "<BixboIcon")
          .replace(/<\/SemanticIco>/g, "</BixboIcon>")
          .replace(/fallbackEmoji=/g, "emoji=");
      }

      if (isDayOverview) {
        next = ensureBixboSafeTextImport(next)
          .replaceAll("{n.text}", "<BixboSafeText text={n.text} size={14} />")
          .replaceAll("{t.title}", "<BixboSafeText text={t.title} size={14} />")
          .replaceAll(
            '{t.note ? ` — ${t.note}` : ""}',
            '{t.note ? <> — <BixboSafeText text={t.note} size={14} /></> : null}',
          )
          .replaceAll("{e.title}", "<BixboSafeText text={e.title} size={14} />")
          .replaceAll(
            '<span className="font-semibold text-foreground">{t("Note")}:</span> {e.note}',
            '<span className="font-semibold text-foreground">{t("Note")}:</span>{" "}<BixboSafeText text={e.note} size={13} />',
          )
          .replaceAll(
            '<span className="font-semibold">{field.label}:</span> {text}',
            '<span className="font-semibold"><BixboSafeText text={field.label} size={12} />:</span>{" "}<BixboSafeText text={text} size={12} />',
          )
          .replaceAll(
            '{entry.note ? <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{entry.note}</p> : null}',
            '{entry.note ? <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground"><BixboSafeText text={entry.note} size={12} /></p> : null}',
          );
      }

      if (isPainWizard) {
        // Pain steps 2 + 3 belong together: location first, pain quality directly below it.
        // Keep quality as its own step only if the location field has been removed in Admin.
        next = next.replace(
          '      ...withoutEpisodes.slice(insertAt),\n    ];',
          '      ...withoutEpisodes.slice(insertAt),\n    ].filter(\n      (field) => field.id !== "quality" || !withoutEpisodes.some((candidate) => candidate.id === "parts"),\n    );',
        );
        next = next.replace(
          '{activePainStepId === "quality" && (',
          '{(activePainStepId === "quality" || (activePainStepId === "parts" && painSteps.every((field) => field.id !== "quality"))) && (',
        );
        next = next.replace(
          '        <div className="space-y-4">\n          <Field label="How does it hurt?">',
          '        <div className={activePainStepId === "parts" ? "mt-4 space-y-4" : "space-y-4"}>\n          <Field label="How does it hurt?">',
        );

        if (next.includes(">💡</span>")) {
          next = ensureBixboIconImport(next).replaceAll(
            ">💡</span>",
            '><BixboIcon emoji="💡" size={18} /></span>',
          );
        }
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
