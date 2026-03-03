/**
 * Scrape professional licensing boards and associations (state bar, medical boards, CPA, nursing, etc.).
 * Scrapes every URL in the list. Tag: professional_association
 */
import { scrapeSeedUrls, type SeedUrlConfig } from "./seedUrlScraper";
import type { ScrapedScholarship } from "./types";

const PROFESSIONAL_ASSOCIATION_SEED_URLS: SeedUrlConfig[] = [
  { url: "https://www.texasbar.com/AM/Template.cfm?Section=Law_Student_Resources&Template=/CM/HTMLDisplay.cfm&ContentID=38234", sponsor: "State Bar of Texas" },
  { url: "https://www.americanbar.org/groups/diversity/women/initiatives_awards/scholarships/", sponsor: "American Bar Association" },
  { url: "https://www.aicpa-cima.com/resources/student-recruitment/scholarships", sponsor: "AICPA" },
  { url: "https://www.nursingworld.org/foundation/scholarships/", sponsor: "American Nurses Foundation" },
  { url: "https://www.nspe.org/resources/students/scholarships", sponsor: "National Society of Professional Engineers" },
];

export async function scrapeProfessionalAssociations(_maxPages = 5): Promise<ScrapedScholarship[]> {
  return scrapeSeedUrls(PROFESSIONAL_ASSOCIATION_SEED_URLS, {
    sourceType: "professional_association",
    idPrefix: "proassoc",
    maxPerPage: 20,
    delayMs: 2000,
  });
}
