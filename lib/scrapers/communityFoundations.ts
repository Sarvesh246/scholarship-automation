/**
 * Scrape community foundation scholarship listing pages.
 * Scrapes every URL in the list. Tag: community_foundation
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

export async function scrapeCommunityFoundations(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(COMMUNITY_FOUNDATION_SEED_URLS, {
    sourceType: "community_foundation",
    idPrefix: "commfdn",
    maxPerPage: 25,
    delayMs: 2000,
  });
}
