import type { Plugin } from "vite";

/**
 * Temporary compatibility transform for the Notes feature only.
 *
 * All non-Notes icon migrations are now materialized in source so production
 * code matches what is reviewed in GitHub. Notes is intentionally deferred to
 * a later pass and keeps its previous runtime icon behavior until then.
 */
export function bixboIconMigrationPlugin(): Plugin {
  return {
    name: "bixbo-notes-icon-compat",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      const isDeferredNotesRoute =
        normalized.endsWith("/src/routes/notes.tsx") ||
        normalized.endsWith("/src/routes/notes-editor.tsx");
      if (!isDeferredNotesRoute) return null;

      let next = code;
      const legacyImport = "@/components/icons/BixboIcons";
      if (next.includes(legacyImport)) {
        next = next.replaceAll(legacyImport, "@/components/icons/BixboExtraIcons");
      }

      if (next.includes("<IcoText")) {
        next = `import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";\n${next}`
          .replaceAll("<IcoText", "<SemanticIcoText")
          .replaceAll("</IcoText>", "</SemanticIcoText>");
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
