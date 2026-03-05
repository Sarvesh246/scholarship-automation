import type { Scholarship, ScholarshipCategory, SourceType } from "@/types";
import { getAdminFirestore } from "./firebaseAdmin";
import { isDeadlineValid } from "./scholarshipDeadline";
import { enrichWithClassification } from "./classifyScholarship";
import { isInstitutionalGrant, isNonStudentTargetedGrant, isStudentTargetedGrant } from "./institutionalGrantFilter";
import { runQualityVerification } from "./scholarshipQuality";
import { formatScholarshipDescription } from "./formatScholarshipDescription";
import { normalizeScholarship } from "./normalizeScholarship";
import { estimateEffortTime } from "./estimateEffort";
import {
  listAllScholarships,
  getScholarship,
  type ScholarshipOwlListItem,
  type ScholarshipOwlDetailResponse,
} from "./scholarshipOwlApi";
import { listEducationGrants, listGrantsByKeyword, fetchOpportunityDetails, type GrantsGovOppHit } from "./grantsGovApi";

/** Shape we can map from common external APIs (ScholarshipAPI.com, Apify, etc.). */
export interface ExternalScholarshipItem {
  id?: string;
  title?: string;
  name?: string;
  sponsor?: string;
  provider?: string;
  organization?: string;
  amount?: number | string;
  deadline?: string;
  description?: string;
  eligibility?: string | string[];
  categories?: string[];
  category?: string;
  prompts?: string[];
  essay_prompts?: string[];
  docsRequired?: string[];
  docs_required?: string[];
  /** Direct URL where the student can apply (official application page). */
  applicationUrl?: string | null;
  /** Set by scrapers for inventory type (e.g. institutional_departmental, professional_association). */
  sourceType?: SourceType | string;
  [key: string]: unknown;
}

const CATEGORY_MAP: Record<string, ScholarshipCategory> = {
  stem: "STEM",
  science: "STEM",
  technology: "STEM",
  engineering: "STEM",
  math: "STEM",
  arts: "Arts",
  art: "Arts",
  music: "Arts",
  community: "Community",
  leadership: "Leadership",
  financial_need: "FinancialNeed",
  financialneed: "FinancialNeed",
  need: "FinancialNeed"
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toCategoryTag(raw: string): ScholarshipCategory | null {
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_MAP[key] ?? null;
}

function parseEligibility(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === "string") {
    return raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parsePrompts(raw: string[] | string | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Extract eligibility-like lines from description when eligibility is empty (e.g. scraped content). */
function extractEligibilityFromDescription(desc: string): string[] {
  const lines: string[] = [];
  const text = desc.replace(/\r\n/g, "\n");
  for (const line of text.split(/\n/)) {
    const t = line.replace(/^[-•*]\s*/, "").trim();
    if (t.length < 10) continue;
    if (/^(Applicant must|Selection based|Eligibility|All majors|College |High school |Master's|Doctoral|No geographic|GPA|Minimum)/i.test(t)) {
      lines.push(t.slice(0, 200));
    }
  }
  if (lines.length === 0) {
    const segments = text.split(/\s+[-–—]\s+|\n\s*[-•*]\s*/);
    for (const s of segments) {
      const t = s.trim();
      if (t.length >= 15 && t.length <= 300 && /(applicant|eligibility|major|college|gpa|geographic|citizen)/i.test(t)) {
        lines.push(t.slice(0, 200));
      }
    }
  }
  if (lines.length === 0) {
    const sentences = text.split(/[.!?]\s+/);
    for (const s of sentences) {
      const t = s.trim();
      if (t.length >= 20 && t.length <= 250 && /(applicant must|selection based|eligibility|enrolled|gpa|full-time|citizen)/i.test(t)) {
        lines.push(t.slice(0, 200));
      }
    }
  }
  if (lines.length === 0 && text.length > 50) {
    const first = text.split(/[.!?]/)[0]?.trim();
    if (first && first.length > 30) lines.push(first.slice(0, 200));
  }
  return lines.slice(0, 10);
}

/** Extract first https? URL from text for use as application URL. */
function extractFirstApplicationUrl(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const m = text.match(/https?:\/\/[^\s)\]'"]+/);
  if (!m?.[0]) return null;
  const url = m[0].replace(/[)\]\s'"]+$/, "").trim();
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

function parseAmount(v: number | string | undefined): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === "string" && v.trim()) {
    const cleaned = v.replace(/,/g, "").trim();
    const n = parseInt(cleaned.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n) && n >= 0) return n;
    if (/\$[\d,]+/.test(v)) {
      const m = v.match(/\$[\d,]+/);
      return m ? parseInt(m[0].replace(/[$,]/g, ""), 10) : 0;
    }
  }
  return 0;
}

/** Map a single external item to our Scholarship shape. */
export function mapExternalToScholarship(item: ExternalScholarshipItem): Scholarship {
  const title = [item.title, item.name].find(Boolean) || "Untitled Scholarship";
  const sponsor = [item.sponsor, item.provider, item.organization].find(Boolean) || "Unknown";
  const id = typeof item.id === "string" && item.id ? slugify(item.id) : slugify(title);
  const categoryTags: ScholarshipCategory[] = [];
  const rawCategories = Array.isArray(item.categories)
    ? item.categories
    : item.category
      ? [item.category]
      : [];
  for (const c of rawCategories) {
    const tag = toCategoryTag(String(c));
    if (tag && !categoryTags.includes(tag)) categoryTags.push(tag);
  }
  if (categoryTags.length === 0) categoryTags.push("Community");

  const eligibilityTags = parseEligibility(item.eligibility);
  const prompts = parsePrompts(item.prompts ?? item.essay_prompts);
  const desc = typeof item.description === "string" ? item.description : "";
  if (eligibilityTags.length === 0 && desc) {
    const extracted = extractEligibilityFromDescription(desc);
    eligibilityTags.push(...extracted);
  }

  const docsCount = Array.isArray(item.docsRequired)
    ? item.docsRequired.length
    : Array.isArray(item.docs_required)
      ? item.docs_required.length
      : undefined;

  const estimatedTime = estimateEffortTime({
    prompts,
    docsCount,
    description: desc || undefined,
  });

  const VALID_SOURCE_TYPES: SourceType[] = [
    "aggregator", "institutional_departmental", "professional_association", "corporate_foundation",
    "municipal", "community_foundation", "research_fellowship", "arts", "civic", "healthcare",
    "industry_specific", "sports", "faith_based", "local_business", "union", "recurring_pending_update",
  ];
  const sourceType =
    typeof item.sourceType === "string" && VALID_SOURCE_TYPES.includes(item.sourceType as SourceType)
      ? (item.sourceType as SourceType)
      : undefined;

  const applicationUrl =
    typeof item.applicationUrl === "string" && item.applicationUrl.trim().startsWith("http")
      ? item.applicationUrl.trim()
      : extractFirstApplicationUrl(desc);

  return {
    id,
    title,
    sponsor,
    amount: parseAmount(item.amount),
    deadline: typeof item.deadline === "string" && item.deadline ? item.deadline : "2026-12-31",
    categoryTags,
    eligibilityTags,
    estimatedTime,
    description: typeof item.description === "string" && item.description.trim()
      ? formatScholarshipDescription(item.description)
      : `${title} from ${sponsor}.`,
    prompts: prompts.length > 0 ? prompts : [],
    ...(sourceType && { sourceType }),
    ...(applicationUrl && { applicationUrl }),
  };
}

/** Fetch from URL (with optional API key in header), parse JSON array or { data: [] }, map and upsert to Firestore. */
export async function syncScholarshipsFromUrl(
  apiUrl: string,
  apiKey?: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (apiKey && !headers["Authorization"]?.startsWith("Bearer")) headers["x-api-key"] = apiKey;

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    throw new Error(`Scholarship API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  let items: ExternalScholarshipItem[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data?.data && Array.isArray(data.data)) {
    items = data.data;
  } else if (data?.scholarships && Array.isArray(data.scholarships)) {
    items = data.scholarships;
  } else if (data?.results && Array.isArray(data.results)) {
    items = data.results;
  } else {
    throw new Error("API response must be an array or an object with data/scholarships/results array");
  }

  const toSync = items
    .filter((item) => isDeadlineValid(item.deadline))
    .map((item) => enrichWithClassification(mapExternalToScholarship(item)))
    .map((s) => {
      const q = runQualityVerification(s);
      const withQuality = { ...s, ...q };
      const normalized = normalizeScholarship(withQuality);
      return {
        ...s,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
        riskFlags: q.riskFlags,
        qualityTier: q.qualityTier,
        fundingType: q.fundingType,
        scholarshipScore: q.scholarshipScore,
        normalized,
      };
    });
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 500;

  for (let offset = 0; offset < toSync.length; offset += BATCH_SIZE) {
    const chunk = toSync.slice(offset, offset + BATCH_SIZE);
    const refs = chunk.map((s) => col.doc(s.id));
    const existing = await Promise.all(refs.map((r) => r.get()));
    const batch = db.batch();
    for (let i = 0; i < chunk.length; i++) {
      try {
        const { id, ...data } = chunk[i];
        const ref = refs[i];
        if (existing[i].exists) {
          batch.update(ref, data);
          updated++;
        } else {
          batch.set(ref, data);
          created++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Item "${chunk[i]?.title ?? "?"}": ${msg}`);
      }
    }
    await batch.commit();
  }

  return { created, updated, errors };
}

/** Fetch JSON from URL and return array of items (array or { items/data/scholarships/results }). */
async function fetchJsonArray(url: string): Promise<ExternalScholarshipItem[]> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.scholarships && Array.isArray(data.scholarships)) return data.scholarships;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

/** Shared: filter by deadline, map to scholarship, run quality, batch write to Firestore. */
async function writeExternalItemsToFirestore(
  items: ExternalScholarshipItem[],
  sourceLabel: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const toSync = items
    .filter((item) => isDeadlineValid(item.deadline))
    .map((item) => {
      const s = enrichWithClassification(mapExternalToScholarship(item));
      s.source = sourceLabel;
      return s;
    })
    .map((s) => {
      const q = runQualityVerification(s);
      const normalized = normalizeScholarship({ ...s, ...q });
      return {
        ...s,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
        riskFlags: q.riskFlags,
        qualityTier: q.qualityTier,
        fundingType: q.fundingType,
        scholarshipScore: q.scholarshipScore,
        normalized,
      };
    });

  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 500;

  for (let offset = 0; offset < toSync.length; offset += BATCH_SIZE) {
    const chunk = toSync.slice(offset, offset + BATCH_SIZE);
    const refs = chunk.map((s) => col.doc(s.id));
    const existing = await Promise.all(refs.map((r) => r.get()));
    const batch = db.batch();
    for (let i = 0; i < chunk.length; i++) {
      try {
        const { id, ...data } = chunk[i];
        const ref = refs[i];
        if (existing[i].exists) {
          batch.update(ref, data);
          updated++;
        } else {
          batch.set(ref, data);
          created++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Item "${chunk[i]?.title ?? "?"}": ${msg}`);
      }
    }
    await batch.commit();
  }

  return { created, updated, errors };
}

/** Import scholarships from RSS/Atom feeds. All items go through quality pipeline. */
export async function syncFromRssFeeds(
  feedUrls: string[],
  sourceLabel = "rss_feed"
): Promise<{ created: number; updated: number; errors: string[] }> {
  const { parseRssFeedsToItems } = await import("./rssFeedSync");
  const items = await parseRssFeedsToItems(feedUrls, sourceLabel);
  return writeExternalItemsToFirestore(items, sourceLabel);
}

/** Import scholarships from multiple URLs (JSON array or { items/data/scholarships/results } per URL). */
export async function syncFromUrlList(
  urls: string[],
  sourceLabel = "import_url"
): Promise<{ created: number; updated: number; errors: string[] }> {
  const allItems: ExternalScholarshipItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const items = await fetchJsonArray(url);
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const prefix = `import_${i}_${j}_`;
        const rawId = item.id ?? [item.title, item.name].find(Boolean) ?? "item";
        const id = typeof rawId === "string" ? rawId : String(rawId);
        allItems.push({ ...item, id: `${prefix}${slugify(String(id))}`.slice(0, 100) });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`URL ${url}: ${msg}`);
    }
  }

  const result = await writeExternalItemsToFirestore(allItems, sourceLabel);
  result.errors.push(...errors);
  return result;
}

/** Import from NIH RePORTER API (research/fellowships). Enable with NIH_REPORTER_ENABLED. May 403 in some environments. */
export async function syncFromNihReporter(): Promise<{ created: number; updated: number; errors: string[] }> {
  const { fetchNihProjectsAsItems } = await import("./nihReporterApi");
  const items = await fetchNihProjectsAsItems();
  return writeExternalItemsToFirestore(items, "nih_reporter");
}
function parseGrantsGovDate(s: string | undefined): string {
  if (!s || typeof s !== "string") return "2026-12-31";
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "2026-12-31";
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Map Grants.gov oppHit to ExternalScholarshipItem. Amount from fetchOpportunityDetails when available. */
async function mapGrantsGovToExternal(
  hit: GrantsGovOppHit,
  details?: {
    awardCeiling?: number;
    awardFloor?: number;
    fundingInstrumentTypes?: string[];
    eligibilityCategories?: string[];
  } | null
): Promise<ExternalScholarshipItem> {
  const url = `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${hit.id}`;
  let amount = 0;
  if (details) {
    if (details.awardCeiling != null && details.awardCeiling > 0) {
      amount = details.awardCeiling;
    } else if (details.awardFloor != null && details.awardFloor > 0) {
      amount = details.awardFloor;
    }
  }
  return {
    id: `grants-gov-${hit.id}`,
    title: hit.title || hit.number || "Federal Grant",
    sponsor: hit.agencyName || hit.agencyCode || "Federal",
    amount,
    deadline: parseGrantsGovDate(hit.closeDate || hit.openDate),
    description: `${hit.title || "Federal grant"} from ${hit.agencyName || "Federal"}. Apply at Grants.gov: ${url}`,
    applicationUrl: url,
  };
}

/** Skip Grants.gov opportunity when API says Cooperative Agreement or no individual eligibility. */
function skipGrantsGovByEligibility(details: {
  fundingInstrumentTypes?: string[];
  eligibilityCategories?: string[];
} | null): boolean {
  if (!details) return false;
  const instruments = (details.fundingInstrumentTypes ?? []).map((s) => s.toLowerCase());
  if (instruments.some((s) => s.includes("cooperative agreement"))) return true;
  const elig = details.eligibilityCategories ?? [];
  if (elig.length === 0) return false; // unknown eligibility → don't skip
  const individualLike = /individual|unrestricted|other/i;
  if (!elig.some((s) => individualLike.test(s))) return true; // only orgs/government
  return false;
}

/** Sync federal grants from Grants.gov into Firestore. No API key required.
 * Fetches by keywords: education, scholarship, fellowship (merged by opportunity id). */
export async function syncFromGrantsGov(maxResults = 500): Promise<{
  created: number;
  updated: number;
  errors: string[];
}> {
  const [educationHits, scholarshipHits, fellowshipHits] = await Promise.all([
    listEducationGrants(Math.floor(maxResults * 0.6)),
    listGrantsByKeyword("scholarship", 200),
    listGrantsByKeyword("fellowship", 200),
  ]);
  const seen = new Set<string>();
  const hits: GrantsGovOppHit[] = [];
  for (const h of [...educationHits, ...scholarshipHits, ...fellowshipHits]) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    hits.push(h);
  }
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < hits.length; i++) {
    if (i > 0 && i % 10 === 0) await new Promise((r) => setTimeout(r, 400));
    const hit = hits[i];
    try {
      const details = await fetchOpportunityDetails(hit.id);
      if (skipGrantsGovByEligibility(details)) continue;
      const item = await mapGrantsGovToExternal(hit, details);
      if (!isDeadlineValid(item.deadline)) continue;
      const scholarship = enrichWithClassification(mapExternalToScholarship(item));
      scholarship.source = "grants_gov";
      scholarship.scholarshipType = "government";
      if (isInstitutionalGrant(scholarship)) continue;
      if (isNonStudentTargetedGrant(scholarship)) continue;
      if (!isStudentTargetedGrant(scholarship)) continue;
      const q = runQualityVerification(scholarship);
      const withQuality = {
        ...scholarship,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
      };
      const normalized = normalizeScholarship(withQuality);
      const toWrite = {
        ...scholarship,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
        riskFlags: q.riskFlags,
        qualityTier: q.qualityTier,
        fundingType: q.fundingType,
        scholarshipScore: q.scholarshipScore,
        normalized,
      };
      const ref = col.doc(toWrite.id);
      const existing = await ref.get();
      const { id, ...data } = toWrite;
      if (existing.exists) {
        await ref.update(data);
        updated++;
      } else {
        await ref.set(data);
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Grants.gov ${hit.id}: ${msg}`);
    }
  }

  return { created, updated, errors };
}

/** Map ScholarshipOwl list item + detail (with included fields/requirements) to our Scholarship */
function mapOwlToScholarship(
  item: ScholarshipOwlListItem,
  detail?: ScholarshipOwlDetailResponse
): Scholarship {
  const att = item.attributes;
  const title = att.title || "Untitled Scholarship";
  const id = item.id;
  const deadline = att.deadline
    ? att.deadline.replace(/T.*$/, "")
    : "2026-12-31";

  const recurring =
    att.recurringValue && att.recurringType
      ? `${att.recurringValue} ${att.recurringType}`
      : null;
  const expiredAt = att.expiredAt ?? null;
  const nextStart = item.meta?.next ?? null;

  const prompts: string[] = [];
  type OwlReq = {
    id: string;
    title?: string;
    description?: string;
    optional: boolean;
    requirementType: "text" | "input" | "link" | "file" | "image";
    config?: Record<string, unknown>;
  };
  const owlRequirements: OwlReq[] = [];
  type OwlField = {
    id: string;
    name: string;
    type: string;
    options?: Record<string, unknown>;
    eligibilityType?: string | null;
    eligibilityValue?: string | null;
    optional?: boolean;
  };
  const owlFields: OwlField[] = [];

  if (detail?.included) {
    const inc = detail.included as Array<{
      type: string;
      id: string;
      attributes?: {
        name?: string;
        type?: string;
        title?: string;
        description?: string;
        optional?: boolean;
        options?: Record<string, unknown>;
        eligibilityType?: string | null;
        eligibilityValue?: string | null;
        config?: Record<string, unknown>;
      };
      relationships?: { requirement?: { data?: { id: string } }; field?: { data?: { id: string } } };
    }>;
    const fieldsById = new Map<string, { name: string; type: string; options?: Record<string, unknown> }>();
    const requirementsById = new Map<string, string>();
    for (const i of inc) {
      if (i.type === "field" && i.attributes) {
        fieldsById.set(i.id, {
          name: i.attributes.name ?? i.id,
          type: i.attributes.type ?? "text",
          options: i.attributes.options,
        });
      }
      if (i.type === "requirement" && i.attributes) {
        requirementsById.set(i.id, i.attributes.type ?? "text");
      }
    }
    for (const i of inc) {
      if (i.type === "scholarship_field") {
        const fieldId = (i.relationships?.field as { data?: { id: string } })?.data?.id;
        const def = fieldId ? fieldsById.get(fieldId) : null;
        owlFields.push({
          id: fieldId ?? i.id,
          name: def?.name ?? i.id,
          type: def?.type ?? "text",
          options: def?.options,
          eligibilityType: i.attributes?.eligibilityType ?? null,
          eligibilityValue: i.attributes?.eligibilityValue ?? null,
          optional: i.attributes?.optional ?? false,
        });
      }
      if (i.type === "scholarship_requirement") {
        const reqTypeId = (i.relationships?.requirement as { data?: { id: string } })?.data?.id;
        const raw = requirementsById.get(reqTypeId ?? "") ?? "text";
        const requirementType = (raw === "essay" ? "text" : raw) as OwlReq["requirementType"];
        owlRequirements.push({
          id: i.id,
          title: i.attributes?.title,
          description: i.attributes?.description,
          optional: i.attributes?.optional ?? false,
          requirementType,
          config: i.attributes?.config,
        });
        if (raw === "essay" || raw === "text" || raw === "input" || raw === "link") {
          const t = i.attributes?.title ?? i.attributes?.description ?? i.id;
          if (t && !prompts.includes(t)) prompts.push(t);
        }
      }
    }
  }
  const amount = (() => {
    const amt = att.amount as number | string | undefined;
    if (typeof amt === "number" && Number.isFinite(amt) && amt > 0) return amt;
    if (typeof amt === "string" && amt.trim()) return parseAmount(amt);
    const desc = att.description ?? "";
    if (desc && parseAmount(desc) > 0) return parseAmount(desc);
    return 0;
  })();

  const docsCount = owlRequirements.filter(
    (r) => r.requirementType === "file" || r.requirementType === "image"
  ).length;
  const estimatedTime = estimateEffortTime({
    prompts,
    docsCount,
    description: typeof att.description === "string" ? att.description : undefined,
  });

  return {
    id,
    title,
    sponsor: "ScholarshipOwl",
    amount,
    deadline,
    categoryTags: ["Community"],
    eligibilityTags: [],
    estimatedTime,
    description: typeof att.description === "string" && att.description.trim()
      ? formatScholarshipDescription(att.description)
      : `${title} from ScholarshipOwl.`,
    prompts,
    source: "scholarship_owl",
    applicationUrl: `https://www.scholarshipowl.com/app/scholarship-view/${id}`,
    recurring,
    expiredAt,
    nextStart,
    owlFields: owlFields.length > 0 ? owlFields : undefined,
    owlRequirements: owlRequirements.length > 0 ? owlRequirements : undefined,
  };
}

/** Run async tasks with concurrency limit. */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i]);
      } catch {
        results[i] = undefined as R;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/** Sync scholarships from ScholarshipOwl API into Firestore. */
export async function syncFromScholarshipOwl(): Promise<{
  created: number;
  updated: number;
  errors: string[];
}> {
  const items = await listAllScholarships();
  const validItems = items.filter((item) =>
    isDeadlineValid(mapOwlToScholarship(item, undefined).deadline)
  );
  const details = await runWithConcurrency(
    validItems,
    5,
    async (item) => {
      try {
        return await getScholarship(item.id, "fields,requirements");
      } catch (e) {
        return undefined;
      }
    }
  );
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const detail = details[i];
    try {
      const scholarship = enrichWithClassification(mapOwlToScholarship(item, detail));
      scholarship.scholarshipType = scholarship.scholarshipType ?? "private";
      const q = runQualityVerification(scholarship);
      const withQuality = {
        ...scholarship,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
      };
      const normalized = normalizeScholarship(withQuality);
      const toWrite = {
        ...scholarship,
        qualityScore: q.qualityScore,
        verificationStatus: q.verificationStatus,
        domainTrustScore: q.domainTrustScore,
        displayCategory: q.displayCategory,
        lastVerifiedAt: q.lastVerifiedAt,
        riskFlags: q.riskFlags,
        qualityTier: q.qualityTier,
        fundingType: q.fundingType,
        scholarshipScore: q.scholarshipScore,
        normalized,
      };
      const ref = col.doc(toWrite.id);
      const existing = await ref.get();
      const { id: _id, ...data } = toWrite;
      if (existing.exists) {
        await ref.update(data);
        updated++;
      } else {
        await ref.set(data);
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Owl ${item.id}: ${msg}`);
    }
  }

  return { created, updated, errors };
}
