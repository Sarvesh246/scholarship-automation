/**
 * Scraper for CollegeData (Peterson's) scholarship finder.
 * Scrapes scholarship-finder with pagination; extracts deadline from card text when present.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.collegedata.com";

export async function scrapeCollegeData(maxPages = 10): Promise<ScrapedScholarship[]> {
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
      let added = 0;

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
        if (!rawTitle || (!text.includes("$") && !text.match(/\d{1,3},?\d{3}/))) return;

        seen.add(id);
        added++;

        const amount = parseAmountFromText(text);
        const dlMatch = text.match(/deadline[:\s]+([^\n]+?)(?:\n|$)/i) ?? text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
        const deadline = dlMatch ? parseDeadline(dlMatch[1].trim()) : "2026-12-31";

        const fullHref = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\//, "")}`;
        const desc = text.slice(0, 400).trim() || `${rawTitle}. Apply at ${fullHref}`;

        results.push({
          id: `collegedata-${id}`,
          title: rawTitle,
          sponsor: "CollegeData",
          amount: amount || 1000,
          deadline,
          description: desc,
        });
      });

      await delay(1200);
      if (added === 0) break;
    } catch (e) {
      console.error("[scraper] collegedata page failed:", page, e);
    }
  }

  return results;
}
