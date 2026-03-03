/**
 * Generic scraper for seed URL lists (department pages, municipal, community foundations, etc.).
 * Fetches each URL and extracts scholarship-like entries from the page.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const SCHOLARSHIP_KEYWORDS = /scholarship|award|fellowship|grant|funding|endowed/i;

export interface SeedUrlConfig {
  url: string;
  /** Optional label for sponsor (e.g. "City of Austin"). */
  sponsor?: string;
}

/**
 * Scrape a list of seed URLs for scholarship listings.
 * Each page is parsed for links/blocks containing amount, deadline, and scholarship keywords.
 */
export async function scrapeSeedUrls(
  seedUrls: SeedUrlConfig[],
  options: {
    sourceType: string;
    idPrefix: string;
    maxPerPage?: number;
    delayMs?: number;
  }
): Promise<ScrapedScholarship[]> {
  const { sourceType, idPrefix, maxPerPage = 30, delayMs = 1500 } = options;
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < seedUrls.length; i++) {
    const { url, sponsor: pageSponsor } = seedUrls[i];
    try {
      const res = await fetch(url, { headers: SCRAPER_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const baseUrl = new URL(url).origin;
      let count = 0;

      // Strategy 1: links whose href or text suggests scholarship/award/fellowship
      $("a[href]").each((_, el) => {
        if (count >= maxPerPage) return false;
        const href = $(el).attr("href") ?? "";
        const text = $(el).text().trim();
        const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        if (!SCHOLARSHIP_KEYWORDS.test(href) && !SCHOLARSHIP_KEYWORDS.test(text)) return;

        const block = $(el).closest("li, div[class], article, tr, .card").length
          ? $(el).closest("li, div[class], article, tr, .card").first()
          : $(el).parent();
        const blockText = block.text();
        if (!blockText.match(/\$|amount|award|deadline/i)) return;

        const title = text.slice(0, 200).trim() || block.find("h1, h2, h3, h4, strong").first().text().trim().slice(0, 200);
        if (!title || title.length < 5) return;

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
        const id = `${idPrefix}-${slug}-${seen.size}`;
        if (seen.has(slug)) return;
        seen.add(slug);

        const amount = parseAmountFromText(blockText);
        const dlMatch = blockText.match(/deadline[:\s]+([^\n]+?)(?:\n|$)/i) ?? blockText.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
        const deadline = dlMatch ? parseDeadline(dlMatch[1].trim()) : "2026-12-31";

        const desc = blockText.slice(0, 500).trim() || `${title}. Apply at ${fullUrl}`;
        results.push({
          id,
          title,
          sponsor: pageSponsor ?? new URL(url).hostname.replace(/^www\./, ""),
          amount,
          deadline,
          description: desc,
          sourceType,
        });
        count++;
      });

      // Strategy 2: list items or divs that look like scholarship cards (contain $ and deadline)
      if (count < maxPerPage) {
        $("li, div[class*='scholarship'], div[class*='award'], [class*='grant']").each((_, el) => {
          if (count >= maxPerPage) return false;
          const $el = $(el);
          const text = $el.text();
          if (!text.match(/\$|\d{1,3},?\d{3}/) || !(SCHOLARSHIP_KEYWORDS.test(text) || text.toLowerCase().includes("deadline"))) return;

          const titleEl = $el.find("h1, h2, h3, h4, a, strong").first();
          const title = (titleEl.text().trim() || text.slice(0, 80)).trim();
          if (!title || title.length < 5) return;

          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
          if (seen.has(slug)) return;
          seen.add(slug);

          const amount = parseAmountFromText(text);
          const dlMatch = text.match(/deadline[:\s]+([^\n]+?)(?:\n|$)/i) ?? text.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
          const deadline = dlMatch ? parseDeadline(dlMatch[1].trim()) : "2026-12-31";
          const link = $el.find("a[href]").attr("href");
          const fullUrl = link ? (link.startsWith("http") ? link : new URL(link, baseUrl).href) : url;

          results.push({
            id: `${idPrefix}-${slug}-${seen.size}`,
            title: title.slice(0, 200),
            sponsor: pageSponsor ?? new URL(url).hostname.replace(/^www\./, ""),
            amount,
            deadline,
            description: text.slice(0, 500).trim() || `${title}. Apply at ${fullUrl}`,
            sourceType,
          });
          count++;
        });
      }

      await delay(delayMs);
    } catch {
      // skip failed URLs
    }
  }

  return results;
}
