/**
 * Scrape municipal / city-level scholarship and youth grant pages.
 * Scrapes every URL in the list. Tag: municipal
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const MUNICIPAL_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://www.austintexas.gov/page/scholarship-opportunities", sponsor: "City of Austin" },
  { url: "https://www.dallas.gov/education/scholarships", sponsor: "City of Dallas" },
  { url: "https://www.houstontx.gov/education/scholarships.html", sponsor: "City of Houston" },
  { url: "https://www.sandiego.gov/youth-scholarships", sponsor: "City of San Diego" },
  { url: "https://www.phoenix.gov/youth/scholarships", sponsor: "City of Phoenix" },
];

export async function scrapeMunicipal(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(MUNICIPAL_SEED_URLS, {
    sourceType: "municipal",
    idPrefix: "municipal",
    maxPerPage: 15,
    delayMs: 1500,
  });
}
