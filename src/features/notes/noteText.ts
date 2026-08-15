const SAFE_NOTE_TAGS = new Set(["B", "STRONG", "MARK", "BR", "P", "DIV", "UL", "OL", "LI"]);
const DROP_NOTE_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "SVG", "MATH", "LINK", "META"]);

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
  return sanitizeNoteHtml(html)
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
}
