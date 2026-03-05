/**
 * Parse RSS/Atom feeds into ExternalScholarshipItem[] for the quality pipeline.
 * Use with syncFromRssFeeds in syncScholarships.
 */
import Parser from "rss-parser";
import type { ExternalScholarshipItem } from "./syncScholarships";

const parser = new Parser({
  timeout: 15000,
  headers: { Accept: "application/rss+xml, application/xml, text/xml" },
});

/** Extract YYYY-MM-DD from description or pubDate. */
function extractDeadline(description: string, pubDate?: string): string {
  const text = (description ?? "").toLowerCase();
  const m = text.match(/deadline[:\s]+([a-z]+\s+\d{1,2},?\s*\d{4})/i)
    ?? text.match(/([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (m) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const monthStr = m[1]?.slice(0, 3) ?? "";
    const mm = months[monthStr] ?? "12";
    const day = (m[2] ?? "01").padStart(2, "0");
    const year = m[3] ?? new Date().getFullYear();
    return `${year}-${mm}-${day}`;
  }
  if (pubDate) {
    const d = new Date(pubDate);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "2026-12-31";
}

/** Extract numeric amount from text. */
function extractAmount(text: string): number {
  const m = text.match(/\$[\d,]+(?:,\d{3})*(?:\.\d{2})?|\$\d+/)
    ?? text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars|USD)/i);
  if (m) {
    const num = parseInt((m[0] ?? m[1] ?? "").replace(/[$,]/g, ""), 10);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Parse one or more RSS/Atom feed URLs and return ExternalScholarshipItem[]. */
export async function parseRssFeedsToItems(
  feedUrls: string[],
  sourceLabel = "rss_feed"
): Promise<ExternalScholarshipItem[]> {
  const items: ExternalScholarshipItem[] = [];
  const seen = new Set<string>();

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const baseSource = sourceLabel === "rss_feed" ? new URL(feedUrl).hostname.replace(/^www\./, "") : sourceLabel;
      for (let i = 0; i < (feed.items?.length ?? 0); i++) {
        const entry = feed.items![i];
        const title = (entry.title ?? "").trim();
        if (!title || title.length < 3) continue;
        const link = (entry.link ?? "").trim();
        const desc = entry.contentSnippet ?? entry.content ?? "";
        const key = `${title}|${link}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const deadline = extractDeadline(desc, entry.pubDate);
        const amount = extractAmount(desc);
        items.push({
          id: `rss-${slugify(baseSource)}-${slugify(title).slice(0, 40)}-${i}`,
          title,
          sponsor: feed.title ?? baseSource,
          amount: amount > 0 ? amount : undefined,
          deadline,
          description: desc.slice(0, 2000) || `${title}. See link for details.`,
          applicationUrl: link.startsWith("http") ? link : undefined,
          sourceType: "aggregator",
        });
      }
    } catch (e) {
      console.warn("[rssFeedSync] Failed to parse feed:", feedUrl, e);
    }
  }

  return items;
}
