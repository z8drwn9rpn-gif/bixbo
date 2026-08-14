import type { Plugin } from "vite";

/**
 * Routes application icon imports through BixboExtraIcons at dev/build time.
 * BixboExtraIcons re-exports the base library and adds semantic symbol mappings,
 * so existing call sites gain the expanded BIXBO icon family without layout or
 * data-flow changes. Icon implementation files are excluded to avoid cycles.
 */
export function bixboIconMigrationPlugin(): Plugin {
  return {
    name: "bixbo-icon-migration",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      if (!normalized.includes("/src/")) return null;
      if (normalized.includes("/src/components/icons/")) return null;
      if (!/\.(ts|tsx)$/.test(normalized)) return null;

      const from = "@/components/icons/BixboIcons";
      if (!code.includes(from)) return null;

      return {
        code: code.replaceAll(from, "@/components/icons/BixboExtraIcons"),
        map: null,
      };
    },
  };
}
