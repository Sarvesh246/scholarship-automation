/**
 * Grants.gov API client.
 * Free, no API key required.
 * Docs: https://www.grants.gov/api/
 */

const BASE_URL = "https://api.grants.gov/v1/api";

export interface GrantsGovOppHit {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agencyName: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  docType?: string;
  alnist?: string[];
}

export interface GrantsGovSearchResponse {
  errorcode: number;
  msg?: string;
  data?: {
    oppHits: GrantsGovOppHit[];
    hitCount: number;
    startRecord: number;
    searchParams?: { rows: number; startRecordNum: number };
  };
}

/** Search for grant opportunities. No auth required. */
export async function searchGrants(params: {
  keyword?: string;
  rows?: number;
  startRecordNum?: number;
  oppStatuses?: string;
}): Promise<GrantsGovSearchResponse> {
  const body = {
    keyword: params.keyword ?? "education",
    rows: params.rows ?? 100,
    startRecordNum: params.startRecordNum ?? 0,
    oppStatuses: params.oppStatuses ?? "posted",
  };
  const res = await fetch(`${BASE_URL}/search2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grants.gov search failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch opportunity details including award ceiling/floor and eligibility/funding instrument. */
export async function fetchOpportunityDetails(opportunityId: string): Promise<{
  awardCeiling?: number;
  awardFloor?: number;
  /** If present, reject "Cooperative Agreement" for main feed. */
  fundingInstrumentTypes?: string[];
  /** If present, keep only when "Individual" (or similar) is included. */
  eligibilityCategories?: string[];
} | null> {
  const id = parseInt(opportunityId, 10);
  if (!Number.isFinite(id)) return null;
  try {
    const res = await fetch(`${BASE_URL}/fetchOpportunity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: id }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const synopsis = data?.data?.synopsis;
    if (!synopsis) return null;
    const parseVal = (v: unknown): number | undefined => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };
    const ceiling = parseVal(synopsis.awardCeiling ?? synopsis.awardCeilingFormatted);
    const floor = parseVal(synopsis.awardFloor ?? synopsis.awardFloorFormatted);

    const fundingInstruments: string[] = [];
    const rawInstruments = data?.data?.fundingInstruments ?? synopsis?.fundingInstruments ?? [];
    if (Array.isArray(rawInstruments)) {
      for (const fi of rawInstruments) {
        const desc = typeof fi === "string" ? fi : fi?.description ?? fi?.id ?? "";
        if (desc) fundingInstruments.push(String(desc));
      }
    }

    const eligibilityCategories: string[] = [];
    const rawElig = data?.data?.applicantTypes ?? data?.data?.eligibility ?? synopsis?.applicantTypes ?? synopsis?.eligibility ?? [];
    if (Array.isArray(rawElig)) {
      for (const e of rawElig) {
        const desc = typeof e === "string" ? e : e?.description ?? e?.category ?? e?.name ?? "";
        if (desc) eligibilityCategories.push(String(desc));
      }
    } else if (rawElig && typeof rawElig === "object" && !Array.isArray(rawElig)) {
      const desc = (rawElig as { description?: string }).description ?? (rawElig as { category?: string }).category;
      if (desc) eligibilityCategories.push(String(desc));
    }

    return {
      awardCeiling: ceiling,
      awardFloor: floor,
      fundingInstrumentTypes: fundingInstruments.length > 0 ? fundingInstruments : undefined,
      eligibilityCategories: eligibilityCategories.length > 0 ? eligibilityCategories : undefined,
    };
  } catch {
    return null;
  }
}

/** Fetch all education-related posted opportunities (paginated). */
export async function listEducationGrants(maxResults = 500): Promise<GrantsGovOppHit[]> {
  const all: GrantsGovOppHit[] = [];
  const rows = 100;
  let startRecordNum = 0;

  while (all.length < maxResults) {
    const resp = await searchGrants({
      keyword: "education",
      rows,
      startRecordNum,
      oppStatuses: "posted",
    });
    if (resp.errorcode !== 0 || !resp.data?.oppHits?.length) break;
    all.push(...resp.data.oppHits);
    if (resp.data.oppHits.length < rows) break;
    startRecordNum += rows;
    if (all.length >= (resp.data.hitCount ?? 0)) break;
  }

  return all.slice(0, maxResults);
}

/** Fetch posted opportunities by keyword (e.g. "scholarship", "fellowship"). */
export async function listGrantsByKeyword(keyword: string, maxResults = 200): Promise<GrantsGovOppHit[]> {
  const all: GrantsGovOppHit[] = [];
  const rows = 100;
  let startRecordNum = 0;

  while (all.length < maxResults) {
    const resp = await searchGrants({
      keyword,
      rows,
      startRecordNum,
      oppStatuses: "posted",
    });
    if (resp.errorcode !== 0 || !resp.data?.oppHits?.length) break;
    all.push(...resp.data.oppHits);
    if (resp.data.oppHits.length < rows) break;
    startRecordNum += rows;
    if (all.length >= (resp.data.hitCount ?? 0)) break;
  }

  return all.slice(0, maxResults);
}
