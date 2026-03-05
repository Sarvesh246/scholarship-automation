/**
 * Scrape Wikipedia "List of North American scholarships" for program names and links.
 * Outputs minimal ScrapedScholarship entries (title, sponsor); quality pipeline will score.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { SCRAPER_HEADERS, delay } from "./shared";

const WIKI_URL = "https://en.wikipedia.org/wiki/List_of_North_American_scholarships";

export async function scrapeWikipediaScholarships(_maxPages = 1): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  try {
    const res = await fetch(WIKI_URL, { headers: SCRAPER_HEADERS });
    if (!res.ok) return results;
    const html = await res.text();
    const $ = cheerio.load(html);

    $("ul li a[href^='/wiki/']").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") ?? "";
      const title = $a.text().trim();
      if (!title || title.length < 5) return;
      if (/^(edit|citation needed|list of|category:|wikipedia:|file:)/i.test(title)) return;
      if (href.includes(":") && !href.startsWith("/wiki/List")) return;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
      if (seen.has(slug)) return;
      seen.add(slug);
      const applicationUrl = href.startsWith("http") ? href : `https://en.wikipedia.org${href}`;
      results.push({
        id: `wiki-${slug}-${seen.size}`,
        title: title.slice(0, 200),
        sponsor: "Wikipedia (list)",
        amount: 0,
        deadline: "2026-12-31",
        description: `${title}. See Wikipedia or official program link for details and application.`,
        sourceType: "aggregator",
        applicationUrl,
      });
    });

    $("table.wikitable td:first-child a[href], table.wikitable th a[href]").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") ?? "";
      const title = $a.text().trim();
      if (!title || title.length < 5) return;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
      if (seen.has(slug)) return;
      seen.add(slug);
      const applicationUrl = href.startsWith("http") ? href : `https://en.wikipedia.org${href}`;
      results.push({
        id: `wiki-table-${slug}-${seen.size}`,
        title: title.slice(0, 200),
        sponsor: "Wikipedia (list)",
        amount: 0,
        deadline: "2026-12-31",
        description: `${title}. See Wikipedia or official program link for details.`,
        sourceType: "aggregator",
        applicationUrl,
      });
    });

    await delay(1500);
  } catch (e) {
    console.warn("[scraper] wikipedia scholarships failed:", e);
  }

  return results;
}
