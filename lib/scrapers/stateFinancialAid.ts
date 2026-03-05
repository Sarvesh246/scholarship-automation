/**
 * Scrape state higher education / financial aid agency scholarship pages.
 * Uses seed URL scraper; tag: civic (state government).
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const STATE_FINANCIAL_AID_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://gsfc.georgia.gov/programs-and-regulations/state-scholarships-grants-and-loans", sponsor: "Georgia Student Finance Commission" },
  { url: "https://hesc.ny.gov/find-aid/nys-grants-scholarships", sponsor: "NY HESC" },
  { url: "https://www.floridastudentfinancialaidsg.org/SAPSFMA/SAPSFMA.htm", sponsor: "Florida DOE" },
  { url: "https://www.isac.org/students/financial-aid-programs.html", sponsor: "Illinois ISAC" },
  { url: "https://www.calgrants.org/", sponsor: "California Student Aid Commission" },
  { url: "https://www.tgslc.org/texas-grants/", sponsor: "Texas TG" },
  { url: "https://www.ohiohighered.org/grants-scholarships", sponsor: "Ohio Dept of Higher Ed" },
  { url: "https://www.pheaa.org/funding-opportunities/index.shtml", sponsor: "PHEAA Pennsylvania" },
  { url: "https://www.mass.edu/osfa/home/home.asp", sponsor: "Massachusetts OSFA" },
  { url: "https://www.nj.gov/highereducation/financial/", sponsor: "NJ Higher Ed" },
  { url: "https://www.nche.org/", sponsor: "North Carolina State Education Assistance" },
  { url: "https://www.michigan.gov/mistudentaid", sponsor: "Michigan Student Aid" },
  { url: "https://www.virginia.gov/education/scholarships-and-grants/", sponsor: "Virginia" },
  { url: "https://www.washingtonstudentachievement.org/", sponsor: "Washington Student Achievement Council" },
  { url: "https://www.azgrants.gov/", sponsor: "Arizona" },
  { url: "https://www.colorado.gov/cche/financial-aid", sponsor: "Colorado Dept of Higher Ed" },
  { url: "https://www.in.gov/ssaci/", sponsor: "Indiana SSACI" },
  { url: "https://www.mo.gov/highered/financial-aid/", sponsor: "Missouri" },
  { url: "https://www.maryland.gov/pages/college-aid.aspx", sponsor: "Maryland" },
  { url: "https://www.wisconsin.gov/state/topics/education/financial-aid", sponsor: "Wisconsin" },
];

export async function scrapeStateFinancialAid(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(STATE_FINANCIAL_AID_SEED_URLS, {
    sourceType: "civic",
    idPrefix: "state_aid",
    maxPerPage: 20,
    delayMs: 2000,
  });
}
