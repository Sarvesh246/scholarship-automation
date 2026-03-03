/**
 * Scraper for Bold.org - thousands of scholarships.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.bold.org";

/** Category page titles/slugs that are not real scholarships. */
const JUNK_TITLES = /^(By\s+)?(Demographics|Major|Year|State)$/i;
const JUNK_SLUGS = new Set(["by-state", "by-major", "by-year", "by-demographics"]);

export async function scrapeBold(maxPages = 3): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? `${BASE_URL}/scholarships/` : `${BASE_URL}/scholarships/${page}/`;
    const res = await fetch(url, { headers: SCRAPER_HEADERS });
    if (!res.ok) break;
    const html = await res.text();
    const $ = cheerio.load(html);

    const CATEGORY_PATHS = ["/by-state/", "/by-major/", "/by-year/", "/by-demographics/"];
    const isCategoryPage = (path: string) => CATEGORY_PATHS.some((p) => path.includes(p));

    $('a[href*="/scholarships/"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (isCategoryPage(href)) return;
      const match = href.match(/\/scholarships\/([^/]+)\/?$/);
      const slug = match?.[1] ?? "";
      if (!slug || seen.has(slug) || JUNK_SLUGS.has(slug) || /^\d+$/.test(slug)) return;

      const card = $(el).closest("article, [class*='card'], [class*='scholarship']");
      const block = card.length ? card : $(el).parent();
      const text = block.text();

      if (!text.includes("Amount") && !text.includes("$")) return;
      seen.add(slug);

      const titleEl = block.find("h2, h3, h4, [class*='title']").first();
      const rawTitle = titleEl.text().trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (JUNK_TITLES.test(rawTitle.trim())) return;

      const amount = parseAmountFromText(text);
      const dlMatch = text.match(/Deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s*\d{4}|[A-Za-z]+\s+\d{1,2}|[A-Za-z]+)/i);
      const deadline = dlMatch ? parseDeadline(dlMatch[1]) : "2026-12-31";

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      const desc = text.slice(0, 400).trim() || `${rawTitle}. Apply at ${fullUrl}`;

      results.push({
        id: `bold-${slug}`,
        title: rawTitle,
        sponsor: "Bold.org",
        amount,
        deadline,
        description: desc,
      });
    });

    await delay(1200);
  }

  return results;
}
