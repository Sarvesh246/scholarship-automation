/**
 * Scholarship web scrapers - run from Admin or API.
 */
import { scrapeCollegeScholarships } from "./collegescholarships";
import { scrapeBold } from "./bold";
import { scrapeScholarshipsCom } from "./scholarshipscom";
import { scrapeScholarships360 } from "./scholarships360";
import { scrapeCollegeData } from "./collegedata";
import { scrapeDepartmentPages } from "./departmentPages";
import { scrapeProfessionalAssociations } from "./professionalAssociations";
import { scrapeMunicipal } from "./municipal";
import { scrapeCommunityFoundations } from "./communityFoundations";
import { scrapeCorporateFoundations } from "./corporateFoundations";
import type { ScrapedScholarship } from "./types";

export type ScraperId =
  | "collegescholarships"
  | "bold"
  | "scholarshipscom"
  | "scholarships360"
  | "collegedata"
  | "department_pages"
  | "professional_associations"
  | "municipal"
  | "community_foundations"
  | "corporate_foundations";

export const SCRAPERS: Record<ScraperId, { name: string; run: (maxPages?: number) => Promise<ScrapedScholarship[]> }> = {
  collegescholarships: {
    name: "CollegeScholarships.org",
    run: (maxPages = 5) => scrapeCollegeScholarships(maxPages),
  },
  bold: {
    name: "Bold.org",
    run: (maxPages = 3) => scrapeBold(maxPages),
  },
  scholarshipscom: {
    name: "Scholarships.com",
    run: (maxPages = 3) => scrapeScholarshipsCom(maxPages),
  },
  scholarships360: {
    name: "Scholarships360",
    run: (maxPages = 3) => scrapeScholarships360(maxPages),
  },
  collegedata: {
    name: "CollegeData",
    run: (maxPages = 3) => scrapeCollegeData(maxPages),
  },
  department_pages: {
    name: "University department pages",
    run: (maxPages = 5) => scrapeDepartmentPages(maxPages),
  },
  professional_associations: {
    name: "Professional associations",
    run: (maxPages = 5) => scrapeProfessionalAssociations(maxPages),
  },
  municipal: {
    name: "Municipal / city",
    run: (maxPages = 5) => scrapeMunicipal(maxPages),
  },
  community_foundations: {
    name: "Community foundations",
    run: (maxPages = 5) => scrapeCommunityFoundations(maxPages),
  },
  corporate_foundations: {
    name: "Corporate foundations",
    run: (maxPages = 5) => scrapeCorporateFoundations(maxPages),
  },
};

export async function runAllScrapers(maxPagesPerSite = 3): Promise<Record<ScraperId, ScrapedScholarship[]>> {
  const entries = Object.entries(SCRAPERS) as [ScraperId, (typeof SCRAPERS)[ScraperId]][];
  const settled = await Promise.allSettled(
    entries.map(async ([id, { run }]) => {
      try {
        return [id, await run(maxPagesPerSite)] as const;
      } catch (e) {
        console.error(`[scraper] ${id} failed:`, e);
        return [id, []] as const;
      }
    })
  );
  const results: Record<string, ScrapedScholarship[]> = {};
  for (const s of settled) {
    if (s.status === "fulfilled") results[s.value[0]] = [...s.value[1]];
  }
  return results as Record<ScraperId, ScrapedScholarship[]>;
}
