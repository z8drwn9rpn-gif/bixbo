import type { Plugin } from "vite";

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
      if (next.includes(from)) next = next.replaceAll(from, "@/components/icons/BixboExtraIcons");

      if (next.includes("<IcoText")) {
        next = `import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";\n${next}`
          .replaceAll("<IcoText", "<SemanticIcoText")
          .replaceAll("</IcoText>", "</SemanticIcoText>");
      }

      if (normalized.endsWith("/features/logging/LifestyleForms.tsx")) {
        next = next
          .replace('{ l: "🍵 Matcha", w: "Matcha", caf: 70 }', '{ l: "Matcha", w: "Matcha", caf: 70 }')
          .replace('{ l: "☕ Coffee", w: "Coffee", caf: 95 }', '{ l: "Coffee", w: "Coffee", caf: 95 }')
          .replace('{ l: "🫖 Tea", w: "Tea", caf: 40 }', '{ l: "Tea", w: "Tea", caf: 40 }')
          .replace('{ l: "💧 Water", w: "Water", hyd: 250 }', '{ l: "Water", w: "Water", hyd: 250 }')
          .replace(
            '{ l: "🥑 Avocado", w: "Avocado" },',
            '{ l: "🥑 Avocado", w: "Avocado" },\n            { l: "Coca-Cola", w: "Coca-Cola" },\n            { l: "Banana", w: "Banana" },\n            { l: "Apple", w: "Apple" },\n            { l: "Bread", w: "Bread" },\n            { l: "Pasta", w: "Pasta" },\n            { l: "Rice", w: "Rice" },\n            { l: "Pizza", w: "Pizza" },\n            { l: "Egg", w: "Egg" },\n            { l: "Cheese", w: "Cheese" },\n            { l: "Chicken", w: "Chicken" },\n            { l: "Salmon", w: "Salmon" },\n            { l: "Salad", w: "Salad" },\n            { l: "Soup", w: "Soup" },\n            { l: "Milk", w: "Milk" },\n            { l: "Sandwich", w: "Sandwich" },\n            { l: "Cake", w: "Cake" },',
          );
      }

      if (normalized.endsWith("/components/QuickTags.tsx")) {
        next = `import { SemanticIco } from "@/components/icons/BixboFoodIcons";\n${next}`
          .replaceAll('<Ico e={tag.emoji} size={22} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={22} />')
          .replaceAll('<Ico e={tag.emoji} size={14} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={14} />')
          .replaceAll('<Ico e={tag.emoji} size={12} />', '<SemanticIco label={t(tag.label)} fallbackEmoji={tag.emoji} size={12} />');
      }

      if (normalized.endsWith("/features/logging/LogSheetRoot.tsx")) {
        next = `import { SemanticIco } from "@/components/icons/BixboFoodIcons";\n${next}`
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
