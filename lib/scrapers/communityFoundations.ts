/**
 * Scrape community foundation scholarship listing pages.
 * Tag: community_foundation
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const COMMUNITY_FOUNDATION_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://www.cftexas.org/scholarships", sponsor: "Communities Foundation of Texas" },
  { url: "https://www.sdfoundation.org/students/scholarships", sponsor: "San Diego Foundation" },
  { url: "https://www.cfgreateratlanta.org/scholarships/", sponsor: "Community Foundation for Greater Atlanta" },
  { url: "https://www.thechicagocommunitytrust.org/scholarships", sponsor: "The Chicago Community Trust" },
  { url: "https://www.siliconvalleycf.org/scholarship-programs", sponsor: "Silicon Valley Community Foundation" },
];

export async function scrapeCommunityFoundations(maxPages = 5): Promise<ScrapedScholarship[]> {
  const urls = COMMUNITY_FOUNDATION_SEED_URLS.slice(0, Math.min(maxPages, COMMUNITY_FOUNDATION_SEED_URLS.length));
  return scrapeSeedUrls(urls, {
    sourceType: "community_foundation",
    idPrefix: "commfdn",
    maxPerPage: 25,
    delayMs: 2000,
  });
}
