/**
 * NIH RePORTER API v2 client for research grants/fellowships.
 * Use when NIH_REPORTER_ENABLED is set; API may 403 in some environments (rate limits, IP).
 * All synced items go through the same quality pipeline (writeExternalItemsToFirestore).
 */
import type { ExternalScholarshipItem } from "./syncScholarships";

const BASE = "https://api.reporter.nih.gov/v2";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 5;

export interface NihProjectHit {
  project_num?: string;
  project_title?: string;
  agency_ic_fundings?: Array<{ fy: number; total_cost?: number; total_cost_sub_project?: number }>;
  organization?: { org_name?: string };
  project_start_date?: string;
  project_end_date?: string;
  terms?: string[];
  full_study_section?: string;
  link?: string;
}

export interface NihSearchResponse {
  total?: number;
  offset?: number;
  limit?: number;
  projects?: NihProjectHit[];
}

/**
 * Search NIH RePORTER for projects (e.g. fellowship/training key terms).
 * No API key required; rate limit ~1 req/sec. May 403 from some IPs.
 */
export async function searchNihProjects(params: {
  keyword?: string;
  offset?: number;
  limit?: number;
}): Promise<NihSearchResponse> {
  const { keyword = "scholarship fellowship training", offset = 0, limit = DEFAULT_PAGE_SIZE } = params;
  const res = await fetch(`${BASE}/projects/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      criteria: {
        advanced_text_search: {
          search_field: "all",
          search_text: keyword,
        },
      },
      offset,
      limit,
    }),
  });
  if (!res.ok) {
    throw new Error(`NIH RePORTER: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<NihSearchResponse>;
}

/**
 * Map a RePORTER project to ExternalScholarshipItem for the quality pipeline.
 */
function mapProjectToItem(p: NihProjectHit, index: number): ExternalScholarshipItem {
  const title = p.project_title ?? "NIH project";
  const id = `nih_${(p.project_num ?? `p${index}`).replace(/\s+/g, "-")}`;
  const fy = p.agency_ic_fundings?.[0];
  const amount = fy?.total_cost ?? fy?.total_cost_sub_project ?? 0;
  const endDate = p.project_end_date ? `${p.project_end_date.slice(0, 4)}-12-31` : "2026-12-31";
  const appUrl = p.link ?? `https://reporter.nih.gov/project-details/${p.project_num?.replace(/\s/g, "")}`;
  return {
    id,
    title: title.slice(0, 300),
    sponsor: p.organization?.org_name ?? "NIH",
    amount: Number(amount) || 0,
    deadline: endDate,
    description: [p.project_title, p.full_study_section && `Study: ${p.full_study_section}`].filter(Boolean).join(". ") || "NIH-funded project.",
    applicationUrl: appUrl,
    sourceType: "government_program",
  };
}

/**
 * Fetch up to MAX_PAGES of projects and return ExternalScholarshipItem[].
 */
export async function fetchNihProjectsAsItems(): Promise<ExternalScholarshipItem[]> {
  const items: ExternalScholarshipItem[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await searchNihProjects({
      keyword: "scholarship fellowship training education",
      offset: page * DEFAULT_PAGE_SIZE,
      limit: DEFAULT_PAGE_SIZE,
    });
    const projects = data.projects ?? [];
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const key = p.project_num ?? p.project_title ?? `i${page}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(mapProjectToItem(p, items.length));
    }
    if (projects.length < DEFAULT_PAGE_SIZE) break;
    await new Promise((r) => setTimeout(r, 1100));
  }

  return items;
}
