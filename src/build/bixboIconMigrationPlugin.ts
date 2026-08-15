import type { Plugin } from "vite";

const BIXBO_ICON_IMPORT = 'import { BixboIcon } from "@/components/icons/BixboIcon";';
const BIXBO_SAFE_TEXT_IMPORT = 'import { BixboSafeText } from "@/components/icons/BixboSafeText";';

function ensureImport(code: string, modulePath: string, statement: string) {
  if (code.includes(modulePath)) return code;
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
 * including legacy Ico, IcoText and SemanticIco helpers.
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

      // Legacy icon slots: preserve the stored emoji value, change only rendering.
      if (next.includes("<Ico e=")) {
        next = ensureBixboIconImport(next).replaceAll("<Ico e=", "<BixboIcon emoji=");
      }

      // Any text that may contain stored/pasted emoji must use the same resolver.
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

      // Semantic icon slots also route through BixboIcon so fallbackEmoji can
      // never hit the older star/category resolver.
      if (next.includes("<SemanticIco")) {
        next = ensureBixboIconImport(next)
          .replace(/<SemanticIco\b/g, "<BixboIcon")
          .replace(/<\/SemanticIco>/g, "</BixboIcon>")
          .replace(/fallbackEmoji=/g, "emoji=");
      }

      // Notes also carried a historical direct import of the old icon family.
      if (isNotesRoute) {
        const legacyImport = "@/components/icons/BixboIcons";
        if (next.includes(legacyImport)) {
          next = next.replaceAll(legacyImport, "@/components/icons/BixboExtraIcons");
        }
      }

      if (isDayOverview && next.includes("{n.text}")) {
        next = ensureBixboSafeTextImport(next).replaceAll(
          "{n.text}",
          "<BixboSafeText text={n.text} size={14} />",
        );
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
