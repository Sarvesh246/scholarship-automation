/**
 * Scraper for collegescholarships.org - 23,000+ scholarships.
 */
import * as cheerio from "cheerio";
import type { ScrapedScholarship } from "./types";
import { parseAmountFromText } from "./parseAmount";
import { SCRAPER_HEADERS, parseDeadline, delay } from "./shared";

const BASE_URL = "https://www.collegescholarships.org";

export async function scrapeCollegeScholarships(maxPages = 5): Promise<ScrapedScholarship[]> {
  const results: ScrapedScholarship[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < maxPages; page++) {
    const url = page === 0
      ? `${BASE_URL}/financial-aid/`
      : `${BASE_URL}/financial-aid/?start=${page * 25}`;
    const res = await fetch(url, { headers: SCRAPER_HEADERS });
    if (!res.ok) break;
    const html = await res.text();
    const $ = cheerio.load(html);

    $('a[href*="/financial-aid/scholarship/"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const slug = href.split("/scholarship/")[1]?.split("?")[0]?.replace(/\/$/, "") ?? "";
      if (!slug || seen.has(slug) || slug.startsWith("sort/")) return;

      const parent = $(el).closest("div, article, li, td");
      if (!parent.length) return;
      const text = parent.text();
      if (!text.includes("Award") || !text.includes("Deadline")) return;

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
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
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

    await delay(800);
  }

  return results;
}
