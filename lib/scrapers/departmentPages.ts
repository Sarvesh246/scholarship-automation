/**
 * Scrape university department-level scholarship pages.
 * Strategy: known department scholarship listing URLs. Scrapes every URL in the list.
 * Tag: institutional_departmental
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const DEPARTMENT_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://www.utexas.edu/engineering/scholarships", sponsor: "UT Austin - Engineering" },
  { url: "https://eng.umich.edu/students/undergraduate/financial-aid/scholarships/", sponsor: "University of Michigan - Engineering" },
  { url: "https://www.cs.utexas.edu/undergraduate-program/scholarships", sponsor: "UT Austin - Computer Science" },
  { url: "https://business.utexas.edu/undergraduate/scholarships/", sponsor: "UT Austin - Business" },
  { url: "https://www.ucf.edu/financial-aid/types/scholarships/", sponsor: "UCF - Financial Aid" },
];

export async function scrapeDepartmentPages(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(DEPARTMENT_SEED_URLS, {
    sourceType: "institutional_departmental",
    idPrefix: "dept",
    maxPerPage: 25,
    delayMs: 2000,
  });
}
