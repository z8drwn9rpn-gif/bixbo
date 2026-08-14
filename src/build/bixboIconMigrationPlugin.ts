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

      let next = code;
      const from = "@/components/icons/BixboIcons";
      if (next.includes(from)) {
        next = next.replaceAll(from, "@/components/icons/BixboExtraIcons");
      }

      // Body & Recovery used the same moon for many unrelated sleep states.
      // Keep moon only where it actually communicates night/sleep; give the
      // individual states distinct branded BIXBO symbols instead.
      if (normalized.endsWith("/features/logging/LogSheetRoot.tsx")) {
        next = next
          .replace('["Terrible", "🌙"]', '["Terrible", "🙁"]')
          .replace('["Restless", "🌙"]', '["Restless", "🌀"]')
          .replace('["Broken sleep", "🌙"]', '["Broken sleep", "💤"]')
          .replace('["Woke up a lot", "🌙"]', '["Woke up a lot", "⏰"]')
          .replace('["Slept in", "🌙"]', '["Slept in", "🛏️"]')
          .replace('["Too long", "🌙"]', '["Too long", "🕒"]')
          .replace('["Vivid dreams", "🌙"]', '["Vivid dreams", "✨"]');
      }

      if (next === code) return null;
      return { code: next, map: null };
    },
  };
}
