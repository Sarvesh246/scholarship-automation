/**
 * Scraper for CollegeData (Peterson's) scholarship finder.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, delay } from "./shared";

const BASE_URL = "https://www.collegedata.com";

export async function scrapeCollegeData(maxPages = 3): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/scholarship-finder`
        : `${BASE_URL}/scholarship-finder?page=${page}`;
      const res = await fetch(url, { headers: SCRAPER_HEADERS });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a[href*="scholarship-finder"]').each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const match = href.match(/scholarship-finder[/%2F]+(\d+)/);
        const id = match?.[1] ?? "";
        if (!id || seen.has(id)) return;

        const card = $(el).closest("div, article, li, section");
        const block = card.length ? card.first() : $(el).parent();
        const text = block.text();
        const titleEl = block.find("h3, h4, h5, [class*='title']").first();
        const rawTitle = titleEl.text().trim();
        if (!rawTitle || !text.includes("$")) return;

        seen.add(id);
        const amount = parseAmountFromText(text);
        const desc = text.slice(0, 400).trim() || `${rawTitle}. Apply at ${BASE_URL}${href}`;

        results.push({
          id: `collegedata-${id}`,
          title: rawTitle,
          sponsor: "CollegeData",
          amount: amount || 1000,
          deadline: "2026-12-31",
          description: desc,
        });
      });

      await delay(1200);
    } catch (e) {
      console.error("[scraper] collegedata page failed:", page, e);
    }
  }

  return results;
}
