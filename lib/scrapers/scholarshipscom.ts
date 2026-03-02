/**
 * Scraper for Scholarships.com - large scholarship database.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.scholarships.com";

export async function scrapeScholarshipsCom(maxPages = 3): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  const urls = [
    `${BASE_URL}/financial-aid/college-scholarships/`,
    `${BASE_URL}/financial-aid/graduate-school-scholarships/`,
    `${BASE_URL}/financial-aid/scholarships-for-high-school-seniors/`,
  ].slice(0, maxPages);

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: SCRAPER_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a[href*="/scholarships/"]').each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const match = href.match(/\/scholarships\/([^/?#]+)/);
        const slug = match?.[1]?.replace(/\/$/, "") ?? "";
        if (!slug || seen.has(slug) || slug.length < 5) return;
        if (["scholarship-search", "scholarship-providers"].some((s) => href.includes(s))) return;

        const container = $(el).closest("article, section, div[class], li").first();
        const block = container.length ? container : $(el).parent();
        const text = block.text().replace(/\s+/g, " ");
        if (!text.match(/Amount|Deadline|\$[\d,]+/i)) return;

        seen.add(slug);
        const titleEl = block.find("h2, h3, h4").first();
        const prevH2 = $(el).closest("div, section, article").find("h2, h3").first();
        const title = (titleEl.length ? titleEl : prevH2).text().trim()
          || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        const amount = parseAmountFromText(text);
        const deadline = parseDeadline(text);

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        const desc = text.slice(0, 500).trim() || `${title}. Apply at ${fullUrl}`;

        results.push({
          id: `scholarshipscom-${slug}`,
          title,
          sponsor: "Scholarships.com",
          amount,
          deadline,
          description: desc,
        });
      });

      await delay(1200);
    } catch (e) {
      console.error("[scraper] scholarshipscom page failed:", url, e);
    }
  }

  return results;
}
