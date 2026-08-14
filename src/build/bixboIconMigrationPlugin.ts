import type { Plugin } from "vite";

/**
 * Routes application icon imports through the expanded BIXBO icon family and
 * upgrades text/chip surfaces to semantic icons without changing stored data.
 * Icon implementation files are excluded to avoid cycles.
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

      // Wherever the app already renders icon-aware text, enrich plain labels
      // such as Matcha, Coca-Cola, banana, pasta, rice, pizza, cheese, etc.
      // Existing emoji remain handled by BixboExtraIcons and are not duplicated.
      if (next.includes("<IcoText")) {
        next = `import { SemanticIcoText } from "@/components/icons/BixboSemanticIcons";\n${next}`
          .replaceAll("<IcoText", "<SemanticIcoText")
          .replaceAll("</IcoText>", "</SemanticIcoText>");
      }

      // Quick Log may contain user-created labels with a generic/default emoji.
      // Prefer the label meaning first, then fall back to the saved symbol.
      if (normalized.endsWith("/components/QuickTags.tsx")) {
        next = `import { SemanticIco } from "@/components/icons/BixboSemanticIcons";\n${next}`
          .replaceAll('<Ico e={tag.emoji} size={22} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={22} />')
          .replaceAll('<Ico e={tag.emoji} size={14} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={14} />')
          .replaceAll('<Ico e={tag.emoji} size={12} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={12} />');
      }

      // Body & Recovery used the same moon for many unrelated sleep states.
      // Use the state label to choose a semantic BIXBO icon; the old symbol is
      // only a fallback when no dedicated meaning exists.
      if (normalized.endsWith("/features/logging/LogSheetRoot.tsx")) {
        next = `import { SemanticIco } from "@/components/icons/BixboSemanticIcons";\n${next}`
          .replace('<Ico e={icon} size={14} />', '<SemanticIco label={t(label)} fallbackEmoji={icon} size={14} />')
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
