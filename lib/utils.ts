export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Format category tag for display (e.g. FinancialNeed → "Financial Need"). */
export function formatCategoryDisplay(tag: string): string {
  if (tag === "FinancialNeed") return "Financial Need";
  return tag;
}

/** Decode common HTML entities in text so "DoW&rsquo;s" displays as "DoW's". Safe for display (no raw HTML). */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

