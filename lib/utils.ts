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

/** Remove common verification boilerplate that appears in scholarship titles from external sources. */
const VERIFICATION_PHRASE = /\s*\.?\s*This scholarship has been verified by the scholarship providing organization\.?\s*/gi;

/** For display: decode HTML entities and strip verification boilerplate from scholarship titles. */
export function displayScholarshipTitle(title: string | undefined | null): string {
  if (!title || typeof title !== "string") return "";
  const decoded = decodeHtmlEntities(title);
  return decoded.replace(VERIFICATION_PHRASE, " ").replace(/\s+/g, " ").trim();
}

