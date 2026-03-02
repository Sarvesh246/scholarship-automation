/**
 * Shared scraper utilities - headers, deadline parsing, rate limiting.
 */

export const SCRAPER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const MONTHS: Record<string, string> = {
  january: "01", jan: "01", february: "02", feb: "02", march: "03", mar: "03",
  april: "04", apr: "04", may: "05", june: "06", jun: "06", july: "07", jul: "07",
  august: "08", aug: "08", september: "09", sep: "09", sept: "09",
  october: "10", oct: "10", november: "11", nov: "11", december: "12", dec: "12",
};

/** Parse deadline text to YYYY-MM-DD. Handles rolling/tbd/varies. */
export function parseDeadline(text: string, rollingPattern = /rolling|tbd|varies|none/i): string {
  if (!text?.trim() || rollingPattern.test(text)) return "2026-12-31";
  const t = text.trim().toLowerCase();
  const fullMatch = t.match(/(?:deadline|next deadline)\s+([a-z]{3})\s*(\d{1,2}),?\s*(\d{4})/i)
    ?? t.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/);
  if (fullMatch) {
    const [, monthStr, day, year] = fullMatch;
    const mm = MONTHS[monthStr?.slice(0, 3) ?? ""] ?? "12";
    return `${year}-${mm}-${(day ?? "01").padStart(2, "0")}`;
  }
  for (const [name, mm] of Object.entries(MONTHS)) {
    if (t.includes(name)) {
      const d = t.match(/(\d{1,2})(?:st|nd|rd|th)?/);
      return `2026-${mm}-${(d?.[1] ?? "01").padStart(2, "0")}`;
    }
  }
  return "2026-12-31";
}

/** Rate limit: wait ms between requests. */
export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
