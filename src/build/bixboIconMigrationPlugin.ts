import type { Plugin } from "vite";

const BIXBO_ICON_IMPORT = 'import { BixboIcon } from "@/components/icons/BixboIcon";';

function ensureBixboIconImport(code: string) {
  if (code.includes("@/components/icons/BixboIcon")) return code;
  return `${BIXBO_ICON_IMPORT}\n${code}`;
}

/**
 * Compatibility transform while stored emoji values remain part of the data model.
 *
 * Important architecture rule:
 * - emoji strings may remain in storage/i18n as stable identifiers;
 * - every JSX icon slot must render through BixboIcon;
 * - BixboIcon resolves exact BIXBO drawings before broad category fallbacks;
 * - native Apple/Android emoji glyphs must never be the visual fallback.
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

      const isNotesRoute =
        normalized.endsWith("/src/routes/notes.tsx") ||
        normalized.endsWith("/src/routes/notes-editor.tsx");
      const isDayOverview = normalized.endsWith("/src/components/home/DayOverview.tsx");
      const isPainWizard = normalized.endsWith("/src/features/logging/PainWizard.tsx");

      let next = code;

      // Centralize all legacy <Ico e=...> render slots without changing the
      // persisted emoji/data identifiers that existing records depend on.
      if (next.includes("<Ico e=")) {
        next = ensureBixboIconImport(next).replaceAll("<Ico e=", "<BixboIcon emoji=");
      }

      if (isNotesRoute) {
        const legacyImport = "@/components/icons/BixboIcons";
        if (next.includes(legacyImport)) {
          next = next.replaceAll(legacyImport, "@/components/icons/BixboExtraIcons");
        }

        if (next.includes("<IcoText")) {
          next = `import { BixboSafeText } from "@/components/icons/BixboSafeText";\n${next}`
            .replaceAll("<IcoText", "<BixboSafeText")
            .replaceAll("</IcoText>", "</BixboSafeText>");
        }
      }

      if (isDayOverview && next.includes("{n.text}")) {
        next = `import { BixboSafeText } from "@/components/icons/BixboSafeText";\n${next}`
          .replaceAll("{n.text}", "<BixboSafeText text={n.text} size={14} />");
      }

      if (isPainWizard && next.includes(">💡</span>")) {
        next = ensureBixboIconImport(next).replaceAll(
          ">💡</span>",
          '><BixboIcon emoji="💡" size={18} /></span>',
        );
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
