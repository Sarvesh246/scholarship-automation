/**
 * Scraper for Scholarships.com - large scholarship database.
 * Scrapes all major sections and scholarship directory; paginates each section up to maxPages.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.scholarships.com";

const SKIP_HREF_PARTS = ["scholarship-search", "scholarship-providers"];

function extractFromPage($: cheerio.CheerioAPI, results: ScrapedScholarship[], seen: Set<string>, baseUrl: string): void {
  $('a[href*="/scholarships/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/\/scholarships\/([^/?#]+)/);
    const slug = match?.[1]?.replace(/\/$/, "") ?? "";
    if (!slug || seen.has(slug) || slug.length < 5) return;
    if (SKIP_HREF_PARTS.some((s) => href.includes(s))) return;

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

    const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
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
}

/** Section path (no leading slash) and optional pagination pattern. */
const SECTIONS: { path: string; paginated?: boolean }[] = [
  { path: "financial-aid/college-scholarships/" },
  { path: "financial-aid/graduate-school-scholarships/" },
  { path: "financial-aid/scholarships-for-high-school-seniors/" },
  { path: "financial-aid/college-scholarships/scholarship-directory/" },
  { path: "financial-aid/college-scholarships/scholarship-directory/deadline/", paginated: true },
  { path: "financial-aid/private-scholarships/" },
];

export async function scrapeScholarshipsCom(maxPages = 5): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (const { path, paginated } of SECTIONS) {
    const baseSectionUrl = `${BASE_URL}/${path.replace(/\/$/, "")}`;
    const pagesToFetch = paginated ? maxPages : 1;
    for (let p = 1; p <= pagesToFetch; p++) {
      const url = p === 1 ? `${baseSectionUrl}/` : `${baseSectionUrl}/page/${p}/`;
      try {
        const res = await fetch(url, { headers: SCRAPER_HEADERS });
        if (!res.ok) break;
        const html = await res.text();
        const $ = cheerio.load(html);
        const before = results.length;
        extractFromPage($, results, seen, BASE_URL);
        await delay(1200);
        if (p > 1 && results.length === before) break;
      } catch (e) {
        console.error("[scraper] scholarshipscom page failed:", url, e);
      }
    }
  }

  return results;
}
