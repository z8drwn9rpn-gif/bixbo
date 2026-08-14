import type { Plugin } from "vite";

/**
 * Compatibility transform for the last text surfaces that can contain stored
 * unicode emoji. Icon slots elsewhere are already materialized through BIXBO
 * components in source; this keeps Notes and the Home day-note preview from
 * falling back to the platform/Apple emoji renderer.
 */
export function bixboIconMigrationPlugin(): Plugin {
  return {
    name: "bixbo-icon-compat",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      const isNotesRoute =
        normalized.endsWith("/src/routes/notes.tsx") ||
        normalized.endsWith("/src/routes/notes-editor.tsx");
      const isDayOverview = normalized.endsWith("/src/components/home/DayOverview.tsx");
      if (!isNotesRoute && !isDayOverview) return null;

      let next = code;

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

      return next === code ? null : { code: next, map: null };
    },
  };
}
