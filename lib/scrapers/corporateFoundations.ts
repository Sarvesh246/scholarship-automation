/**
 * Scrape corporate foundation / CSR scholarship pages.
 * Scrapes every URL in the list. Tag: corporate_foundation
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const CORPORATE_FOUNDATION_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://www.coca-colacompany.com/sustainability/community/education", sponsor: "Coca-Cola Foundation" },
  { url: "https://www.walmart.org/community/education/scholarships", sponsor: "Walmart Foundation" },
  { url: "https://corporate.target.com/corporate-responsibility/grants/scholarships", sponsor: "Target" },
  { url: "https://www.verizon.com/about/responsibility/education", sponsor: "Verizon" },
  { url: "https://www.bankofamerica.com/community/financial-education/scholarships.go", sponsor: "Bank of America" },
];

export async function scrapeCorporateFoundations(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(CORPORATE_FOUNDATION_SEED_URLS, {
    sourceType: "corporate_foundation",
    idPrefix: "corpfdn",
    maxPerPage: 20,
    delayMs: 2000,
  });
}
