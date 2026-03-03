import { marked } from "marked";
import TurndownService from "turndown";

/** Detect if content is HTML (vs plain markdown). */
export function isHtml(content: string): boolean {
  if (!content?.trim()) return false;
  const trimmed = content.trim();
  return trimmed.startsWith("<") && trimmed.includes(">");
}

/** Convert markdown to HTML for the rich text editor. */
export function markdownToHtml(md: string): string {
  if (!md?.trim()) return "";
  try {
    return marked.parse(md, { async: false }) as string;
  } catch {
    return md;
  }
}

/** Convert HTML to markdown for export. */
export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return "";
  try {
    const td = new TurndownService({ headingStyle: "atx" });
    return td.turndown(html).trim();
  } catch {
    return html;
  }
}

/** Strip HTML tags for plain text / word count. */
export function htmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

/** Normalize content for the editor: accept markdown or HTML, return HTML. */
export function contentForEditor(content: string): string {
  if (!content?.trim()) return "";
  return isHtml(content) ? content : markdownToHtml(content);
}
