/**
 * Scraper for Scholarships360 - vetted scholarship database.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://scholarships360.org";

export async function scrapeScholarships360(maxPages = 3): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/scholarships/search/`
        : `${BASE_URL}/scholarships/search/?page=${page}`;
      const res = await fetch(url, { headers: SCRAPER_HEADERS });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a[href*="/scholarships/"]').each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const match = href.match(/\/scholarships\/(?:search\/)?([^/?#]+)\/?$/);
        const slug = match?.[1] ?? "";
        if (!slug || seen.has(slug)) return;
        if (["search", "scholarship-winners", "our-partners"].includes(slug)) return;

        const card = $(el).closest("article, [class*='card'], [class*='scholarship'], div");
        const block = card.length ? card.first() : $(el).parent();
        const text = block.text();
        if (!text.includes("$") && !text.includes("award")) return;

        const titleEl = block.find("h2, h3, h4, [class*='title']").first();
        const rawTitle = (titleEl.text().trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
          .replace(/\s+/g, " ")
          .split(/\n/)[0]
          .trim();
        const skipTitles = ["student-centric", "advertiser disclosure", "why choose", "scholarship review", "explore vetted"];
        if (skipTitles.some((s) => rawTitle.toLowerCase().includes(s))) return;
        if (rawTitle.length < 15) return;

        seen.add(slug);
        const title = rawTitle;

        const amount = parseAmountFromText(text);
        const deadline = parseDeadline(text);
        if (amount === 0 && !text.includes("award")) return;

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        const desc = text.slice(0, 400).trim() || `${title}. Apply at ${fullUrl}`;

        results.push({
          id: `scholarships360-${slug}`,
          title,
          sponsor: "Scholarships360",
          amount: amount || 1000,
          deadline,
          description: desc,
        });
      });

      await delay(1200);
    } catch (e) {
      console.error("[scraper] scholarships360 page failed:", page, e);
    }
  }

  return results;
}
