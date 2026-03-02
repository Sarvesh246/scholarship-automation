import type { Scholarship } from "@/types";
import type { ScholarshipCategory } from "@/types";
import { getAdminFirestore } from "./firebaseAdmin";

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
