/**
 * Scraper for Scholarships360 - vetted scholarship database.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://scholarships360.org";

const SKIP_SLUGS = new Set(["search", "scholarship-winners", "our-partners"]);
const SKIP_TITLES = ["student-centric", "advertiser disclosure", "why choose", "scholarship review", "explore vetted"];

export async function scrapeScholarships360(maxPages = 10): Promise<ScrapedScholarship[]> {
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
      let added = 0;

      $('a[href*="/scholarships/"]').each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const match = href.match(/\/scholarships\/(?:search\/)?([^/?#]+)\/?$/);
        const slug = match?.[1] ?? "";
        if (!slug || seen.has(slug) || SKIP_SLUGS.has(slug)) return;

        const card = $(el).closest("article, [class*='card'], [class*='scholarship'], div");
        const block = card.length ? card.first() : $(el).parent();
        const text = block.text();
        if (!text.includes("$") && !text.includes("award")) return;

        const titleEl = block.find("h2, h3, h4, [class*='title']").first();
        const rawTitle = (titleEl.text().trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
          .replace(/\s+/g, " ")
          .split(/\n/)[0]
          .trim();
        if (SKIP_TITLES.some((s) => rawTitle.toLowerCase().includes(s))) return;
        if (rawTitle.length < 15) return;

        seen.add(slug);
        added++;

        const amount = parseAmountFromText(text);
        const deadline = parseDeadline(text);
        if (amount === 0 && !text.includes("award")) return;

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        const desc = text.slice(0, 400).trim() || `${rawTitle}. Apply at ${fullUrl}`;

        results.push({
          id: `scholarships360-${slug}`,
          title: rawTitle,
          sponsor: "Scholarships360",
          amount: amount || 1000,
          deadline,
          description: desc,
        });
      });

      await delay(1200);
      if (added === 0) break;
    } catch (e) {
      console.error("[scraper] scholarships360 page failed:", page, e);
    }
  }

  return results;
}
