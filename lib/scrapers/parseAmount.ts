/**
 * Shared amount parsing for scrapers.
 * Handles common formats: $X,XXX | $X - $Y | Amount: $X | Award: $X | X award worth $Y | full tuition
 */
export function parseAmountFromText(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const t = text.replace(/\s+/g, " ");

  if (/full[- ]?tuition|full tuition/i.test(t)) return 50000;

  const patterns = [
    /(?:amount|award|worth|up to|max)\s*[:\s]*\$?\s*([\d,]+)(?:\s*[-–—]\s*\$?([\d,]+))?/i,
    /\$([\d,]+)\s*[-–—]\s*\$?([\d,]+)/,
    /(\d+)\s*award[s]?\s*(?:worth|of)\s*\$?([\d,]+)/i,
    /\$([\d,]+)/,
  ];

  for (const pattern of patterns) {
    const m = t.match(pattern);
    if (m) {
      const high = m[2] ? parseInt((m[2] || m[1]).replace(/,/g, ""), 10) : parseInt((m[1] || "0").replace(/,/g, ""), 10);
      if (Number.isFinite(high) && high > 0) return high;
    }
  }

  return 0;
}
