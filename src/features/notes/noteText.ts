const SAFE_NOTE_TAGS = new Set(["B", "STRONG", "MARK", "BR", "P", "DIV", "UL", "OL", "LI"]);
const DROP_NOTE_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "SVG", "MATH", "LINK", "META"]);

const RECIPE_SECTION_HEADINGS = new Set([
  "cesto",
  "plnka",
  "spodok",
  "vrch",
  "nalev",
  "nálev",
  "poleva",
  "obalit v",
  "na vrch (nutné)",
  "na vrch",
  "škoricová náplň",
  "skoricova napln",
  "krémová poleva",
  "kremova poleva",
  "čokoládová poleva",
  "cokoladova poleva",
]);

function normalizedRecipeHeading(value: string): string {
  return value
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[*_]/g, "")
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

function isRecipeCategoryLine(value: string): boolean {
  const upper = value.replace(/[^A-Za-zÁ-ž]/g, " ").toUpperCase();
  return /\bBAKING\b|\bCOOKING\b|\bNATIERKY\b|\bNÁTIERKY\b|\bSPREADS\b/.test(upper);
}

function isRecipeBullet(value: string): boolean {
  return /^\s*[-*•]\s+/.test(value);
}

function isRecipeStep(value: string): boolean {
  return /^\s*\d+[.)]\s+/.test(value);
}

function isRecipeMethodHeading(value: string): boolean {
  const heading = normalizedRecipeHeading(value);
  return heading === "postup" || heading === "method" || heading === "tvarovanie a pečenie" || heading === "tvarovanie a pecenie";
}

function isRecipeIngredientsHeading(value: string): boolean {
  const heading = normalizedRecipeHeading(value);
  return heading === "suroviny" || heading === "ingrediencie" || heading === "ingredients";
}

function isRecipeNotesHeading(value: string): boolean {
  const heading = normalizedRecipeHeading(value);
  return heading === "tipy & skladovanie" || heading === "poznámky" || heading === "poznamky" || heading === "notes";
}

function isRecipeSectionHeading(value: string): boolean {
  return RECIPE_SECTION_HEADINGS.has(normalizedRecipeHeading(value));
}

function isRecipePlaceholder(value: string): boolean {
  return /recept\s+(čoskoro|coskoro)|recipe\s+coming\s+soon/i.test(value);
}

function cleanRecipeTitle(value: string): string {
  return value
    .replace(/[*_#]/g, "")
    .replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "")
    .replace(/^[-—–]\s*/, "")
    .trim();
}

function nextNonEmptyRecipeLine(lines: string[], index: number): string | undefined {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor].trim()) return lines[cursor].trim();
  }
  return undefined;
}

function looksLikeRecipeTitle(lines: string[], index: number): boolean {
  const value = lines[index].trim();
  if (!value || isRecipeCategoryLine(value) || isRecipeBullet(value) || isRecipeStep(value)) return false;
  if (isRecipeMethodHeading(value) || isRecipeIngredientsHeading(value) || isRecipeNotesHeading(value) || isRecipeSectionHeading(value)) return false;
  if (/^\d/.test(value) || /°\s*c/i.test(value)) return false;
  if (value.length > 90) return false;

  const next = nextNonEmptyRecipeLine(lines, index);
  if (next && (isRecipeBullet(next) || isRecipePlaceholder(next) || isRecipeIngredientsHeading(next))) return true;

  const words = cleanRecipeTitle(value).split(/\s+/).filter(Boolean);
  const previousBlank = index === 0 || !lines[index - 1].trim();
  const sentenceLike = /[.!?]$/.test(value) || /^(po|potom|nakoniec|môže|moze|podávame|podavame|dáme|dame|varíme|varime)\b/i.test(cleanRecipeTitle(value));
  return previousBlank && words.length > 0 && words.length <= 7 && !sentenceLike;
}

export function compactRecipeSpacing(text: string): string {
  const normalized = text.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const recipeCollection = lines.some(isRecipeCategoryLine) && lines.some(isRecipeMethodHeading);
  if (!recipeCollection) return normalized;

  const titleIndexes = new Set<number>();
  lines.forEach((_, index) => {
    if (looksLikeRecipeTitle(lines, index)) titleIndexes.add(index);
  });

  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\s+$/g, "");
    if (line.trim()) {
      output.push(line);
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
    if (nextIndex >= lines.length) continue;

    const keepRecipeSeparator = isRecipeCategoryLine(lines[nextIndex]) || titleIndexes.has(nextIndex);
    if (keepRecipeSeparator && output.length && output[output.length - 1] !== "") output.push("");
  }

  return output.join("\n").trimEnd();
}

export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";

  if (typeof document === "undefined") {
    return html
      .replace(/<(script|style|iframe|object|embed|img|svg|math|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|style|iframe|object|embed|img|svg|math|link|meta)\b[^>]*\/?\s*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript\s*:/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const cleanNode = (node: Node) => {
    for (const child of [...node.childNodes]) cleanNode(child);
    if (!(node instanceof HTMLElement)) return;

    if (DROP_NOTE_TAGS.has(node.tagName)) {
      node.remove();
      return;
    }

    if (!SAFE_NOTE_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
  };

  for (const child of [...template.content.childNodes]) cleanNode(child);
  return template.innerHTML;
}

export function htmlToPlainText(html: string): string {
  const plain = sanitizeNoteHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  return compactRecipeSpacing(plain);
}
