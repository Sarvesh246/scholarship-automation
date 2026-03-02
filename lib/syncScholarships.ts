import type { Scholarship } from "@/types";
import type { ScholarshipCategory } from "@/types";
import { getAdminFirestore } from "./firebaseAdmin";
import {
  listAllScholarships,
  getScholarship,
  type ScholarshipOwlListItem,
  type ScholarshipOwlDetailResponse,
} from "./scholarshipOwlApi";

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

function parseAmount(v: number | string | undefined): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
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
  if (prompts.length === 0) prompts.push("Tell us why you are a strong candidate for this scholarship.");

  return {
    id,
    title,
    sponsor,
    amount: parseAmount(item.amount),
    deadline: typeof item.deadline === "string" && item.deadline ? item.deadline : "2026-12-31",
    categoryTags,
    eligibilityTags,
    estimatedTime: "2–3 hours",
    description: typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : `${title} from ${sponsor}.`,
    prompts
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

  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const scholarship = mapExternalToScholarship(item);
      const ref = col.doc(scholarship.id);
      const existing = await ref.get();
      const { id, ...data } = scholarship;
      if (existing.exists) {
        await ref.update(data);
        updated++;
      } else {
        await ref.set(data);
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Item "${item?.title ?? item?.name ?? '?'}": ${msg}`);
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
  if (prompts.length === 0) prompts.push("Tell us why you are a strong candidate for this scholarship.");

  return {
    id,
    title,
    sponsor: "ScholarshipOwl",
    amount: typeof att.amount === "number" && Number.isFinite(att.amount) ? att.amount : 0,
    deadline,
    categoryTags: ["Community"],
    eligibilityTags: [],
    estimatedTime: "2–3 hours",
    description: typeof att.description === "string" && att.description.trim()
      ? att.description.trim()
      : `${title} from ScholarshipOwl.`,
    prompts,
    source: "scholarship_owl",
    recurring,
    expiredAt,
    nextStart,
    owlFields: owlFields.length > 0 ? owlFields : undefined,
    owlRequirements: owlRequirements.length > 0 ? owlRequirements : undefined,
  };
}

/** Sync scholarships from ScholarshipOwl API into Firestore. */
export async function syncFromScholarshipOwl(): Promise<{
  created: number;
  updated: number;
  errors: string[];
}> {
  const items = await listAllScholarships();
  const db = getAdminFirestore();
  const col = db.collection("scholarships");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      let detail: ScholarshipOwlDetailResponse | undefined;
      try {
        detail = await getScholarship(item.id, "fields,requirements");
      } catch (e) {
        if (errors.length < 5) errors.push(`${item.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
      const scholarship = mapOwlToScholarship(item, detail);
      const ref = col.doc(scholarship.id);
      const existing = await ref.get();
      const { id: _id, ...data } = scholarship;
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
