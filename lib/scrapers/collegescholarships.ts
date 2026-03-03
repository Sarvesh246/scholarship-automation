/**
 * Scraper for collegescholarships.org - 23,000+ scholarships.
 * Scrapes main financial-aid listing (paginated with ?page=N) and our-scholarships section.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.collegescholarships.org";

function extractFromListing($: cheerio.CheerioAPI, results: ScrapedScholarship[], seen: Set<string>, baseUrl: string): void {
  $('a[href*="/financial-aid/scholarship/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const slug = href.split("/scholarship/")[1]?.split("?")[0]?.replace(/\/$/, "") ?? "";
    if (!slug || seen.has(slug) || slug.startsWith("sort/")) return;

    const parent = $(el).closest("div, article, li, td");
    if (!parent.length) return;
    const text = parent.text();
    if (!text.includes("Award") && !text.includes("Deadline") && !text.match(/\$[\d,]+/)) return;

    seen.add(slug);
    const titleEl = parent.find("h4, h3, h2").first();
    const title = titleEl.text().trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    let amount = parseAmountFromText(text);
    if (amount === 0) {
      const amtMatch = text.match(/Award\s*:\s*\$?([\d,]+)|Award\s+\$([\d,]+)/i);
      amount = amtMatch ? parseInt((amtMatch[1] || amtMatch[2] || "0").replace(/,/g, ""), 10) : 0;
    }

    const dlMatch = text.match(/Deadline\s+([A-Za-z][^.\n]*?)(?:\s+\[|$)/);
    const deadline = dlMatch ? parseDeadline(dlMatch[1].trim()) : "2026-12-31";

    let desc = "";
    const parts: string[] = [];
    parent.find("p").each((_, p) => {
      const t = $(p).text().trim();
      if (t.length > 60) parts.push(t);
    });
    parent.find("li").each((_, li) => {
      const t = $(li).text().trim();
      if (t.length > 5 && t.length < 150) parts.push(`• ${t}`);
    });
    if (parts.length > 0) desc = parts.join("\n\n").slice(0, 800);
    const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
    if (!desc) desc = `${title}. Apply at ${fullUrl}`;
    else if (!desc.includes("Apply at")) desc += `\n\nApply at ${fullUrl}`;

    results.push({
      id: `collegescholarships-${slug}`,
      title,
      sponsor: "CollegeScholarships.org",
      amount,
      deadline,
      description: desc,
    });
  });
}

export async function scrapeCollegeScholarships(maxPages = 10): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  // Main financial-aid listing: ?page=N (1-based)
  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/financial-aid/`
        : `${BASE_URL}/financial-aid/?page=${page}`;
      const res = await fetch(url, { headers: SCRAPER_HEADERS });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);
      extractFromListing($, results, seen, BASE_URL);
      await delay(800);
    } catch (e) {
      console.error("[scraper] collegescholarships page failed:", page, e);
    }
  }

  // Our Scholarships section (different listing)
  try {
    const res = await fetch(`${BASE_URL}/our-scholarships/`, { headers: SCRAPER_HEADERS });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      $('a[href*="/financial-aid/scholarship/"], a[href*="/scholarship/"]').each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const slug = (href.match(/\/scholarship\/([^/?#]+)/) ?? [])[1]?.replace(/\/$/, "") ?? "";
        if (!slug || seen.has(slug) || slug.startsWith("sort/")) return;
        const parent = $(el).closest("div, article, li, p");
        const block = parent.length ? parent : $(el).parent();
        const text = block.text();
        if (!text.trim() || text.length < 10) return;
        seen.add(slug);
        const titleEl = block.find("h1, h2, h3, h4").first();
        const title = titleEl.text().trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const amount = parseAmountFromText(text);
        const deadline = parseDeadline(text);
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
        results.push({
          id: `collegescholarships-${slug}`,
          title,
          sponsor: "CollegeScholarships.org",
          amount: amount || 1000,
          deadline,
          description: text.slice(0, 600).trim() || `${title}. Apply at ${fullUrl}`,
        });
      });
      await delay(800);
    }
  } catch (e) {
    console.error("[scraper] collegescholarships our-scholarships failed:", e);
  }

  return results;
}
