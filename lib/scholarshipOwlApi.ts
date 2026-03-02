/**
 * ScholarshipOwl Business API client.
 * Base URL: https://api.business.scholarshipowl.com
 * Auth: SCHOLARSHIP-APP-API-Key header.
 */

const BASE_URL = "https://api.business.scholarshipowl.com";

function getApiKey(): string {
  const key = process.env.SCHOLARSHIP_OWL_API_KEY;
  if (!key?.trim()) {
    throw new Error("SCHOLARSHIP_OWL_API_KEY is not set");
  }
  return key.trim();
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "SCHOLARSHIP-APP-API-Key": getApiKey(),
  };
}

/** Requirement types from API: text (essay), input, link, file, image */
export type ScholarshipOwlRequirementType = "text" | "input" | "link" | "file" | "image";

/** Recurring period: day | week | month | year */
export type ScholarshipOwlRecurringType = "day" | "week" | "month" | "year";

/** Application status from API after apply */
export type ScholarshipOwlApplicationStatusId = "received" | "review" | "accepted" | "rejected";

/** JSON:API–style list response for scholarships */
export interface ScholarshipOwlListItem {
  type: "scholarship";
  id: string;
  attributes: {
    title: string;
    description?: string;
    amount?: number;
    awards?: number;
    start?: string;
    deadline?: string;
    timezone?: string;
    recurringValue?: string | null;
    recurringType?: ScholarshipOwlRecurringType | null;
    isFree?: boolean;
    expiredAt?: string | null;
  };
  /** If repeatable, next scholarship start date */
  meta?: { next?: string | null };
  links?: { self: string };
}

export interface ScholarshipOwlListResponse {
  data: ScholarshipOwlListItem[];
}

/** Single scholarship with optional includes */
export interface ScholarshipOwlDetailResponse {
  data: ScholarshipOwlScholarshipResource;
  included?: ScholarshipOwlIncluded[];
}

export interface ScholarshipOwlScholarshipResource {
  type: "scholarship";
  id: string;
  attributes: {
    title: string;
    description?: string;
    amount?: number;
    awards?: number;
    start?: string;
    deadline?: string;
    timezone?: string;
    recurringValue?: string | null;
    recurringType?: ScholarshipOwlRecurringType | null;
    isFree?: boolean;
    expiredAt?: string | null;
  };
  relationships?: {
    fields?: { data?: { type: string; id: string }[] };
    requirements?: { data?: { type: string; id: string }[] };
  };
  meta?: { next?: string | null };
  links?: { self: string };
}

export type ScholarshipOwlIncluded =
  | { type: "field"; id: string; attributes: { name: string; type: string; options?: Record<string, unknown> }; links?: { self: string } }
  | { type: "requirement"; id: string; attributes: { type?: ScholarshipOwlRequirementType; name?: string }; links?: { self: string } }
  | { type: "scholarship_field"; id: string; attributes?: { eligibilityType?: string | null; eligibilityValue?: string | null; optional?: boolean }; relationships?: { field?: { data?: { type: string; id: string } } }; links?: { self: string } }
  | { type: "scholarship_requirement"; id: string; attributes?: { title?: string; description?: string; optional?: boolean; permanentId?: number; config?: Record<string, unknown> }; relationships?: { requirement?: { data?: { type: string; id: string } } }; links?: { self: string } };

/** Scholarship field: student data required to apply; can have eligibility conditions */
export interface ScholarshipOwlScholarshipField {
  id: string;
  eligibilityType?: string | null;
  eligibilityValue?: string | null;
  optional?: boolean;
  field?: { id: string; name: string; type: string; options?: Record<string, unknown> };
}

/** Scholarship requirement: must be sent as application data. Types: text (essay), input, link, file, image */
export interface ScholarshipOwlScholarshipRequirement {
  id: string;
  title?: string;
  description?: string;
  optional: boolean;
  requirementType: ScholarshipOwlRequirementType;
  config?: Record<string, unknown>;
}

/** Scholarship field (from include=fields or /scholarship/@id/fields). id can be integer in API. */
export interface ScholarshipOwlFieldsResponse {
  data: Array<{
    type: "scholarship_field";
    id: string;
    attributes?: { eligibilityType?: string | null; eligibilityValue?: string | null; optional?: boolean };
    relationships?: { field?: { data?: { type: string; id: string }; links?: { related: string } } };
    links?: { self: string };
  }>;
  included?: Array<{
    type: "field";
    id: string;
    attributes: { name: string; type: string; options?: Record<string, string | { name: string; abbreviation?: string }> };
    links?: { self: string };
  }>;
}

/** Scholarship requirement (from include=requirements or /scholarship/@id/requirements). Types: text, input, link, file, image */
export interface ScholarshipOwlRequirementsResponse {
  data: Array<{
    type: "scholarship_requirement";
    id: string;
    attributes: { title?: string; description?: string; optional?: boolean; permanentId?: number; config?: Record<string, unknown> };
    relationships?: { requirement?: { data?: { type: string; id: string }; links?: { related: string } } };
    links?: { self: string };
  }>;
  included?: Array<{
    type: "requirement";
    id: string;
    attributes: { type?: ScholarshipOwlRequirementType; name?: string };
    links?: { self: string };
  }>;
}

/** Apply request body (JSON:API) */
export interface ScholarshipOwlApplyAttributes {
  name?: string;
  email?: string;
  phone?: string;
  state?: string;
  [fieldId: string]: string | Record<string, string> | undefined;
  requirements?: Record<string, string>;
  source?: string;
}

export interface ScholarshipOwlApplyResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      id?: string;
      name?: string;
      email?: string;
      source?: string;
      data?: Record<string, unknown>;
      createdAt?: string;
    };
    relationships?: {
      status?: { data?: { type: string; id: ScholarshipOwlApplicationStatusId }; links?: { related: string } };
      scholarship?: { data?: { type: string; id: string }; links?: { related: string } };
    };
    [key: string]: unknown;
  };
}

/** Pagination: page[number]=1-based, page[size]=per page */
export async function listScholarships(
  pageNumber = 1,
  pageSize = 100
): Promise<ScholarshipOwlListResponse> {
  const url = `${BASE_URL}/api/scholarship?page[number]=${pageNumber}&page[size]=${pageSize}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ScholarshipOwl list failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Get one scholarship; optionally include fields and requirements */
export async function getScholarship(
  id: string,
  include: "fields" | "requirements" | "fields,requirements" = "fields,requirements"
): Promise<ScholarshipOwlDetailResponse> {
  const url = `${BASE_URL}/api/scholarship/${encodeURIComponent(id)}?include=${include}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ScholarshipOwl get failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getScholarshipFields(id: string): Promise<ScholarshipOwlFieldsResponse> {
  const url = `${BASE_URL}/api/scholarship/${encodeURIComponent(id)}/fields`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ScholarshipOwl fields failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getScholarshipRequirements(
  id: string
): Promise<ScholarshipOwlRequirementsResponse> {
  const url = `${BASE_URL}/api/scholarship/${encodeURIComponent(id)}/requirements`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ScholarshipOwl requirements failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Apply to a scholarship. Attributes must include required fields + requirements. */
export async function applyToScholarship(
  scholarshipId: string,
  attributes: ScholarshipOwlApplyAttributes
): Promise<ScholarshipOwlApplyResponse> {
  const url = `${BASE_URL}/api/scholarship/${encodeURIComponent(scholarshipId)}/apply`;
  const body = {
    data: {
      attributes: {
        ...attributes,
        source: attributes.source ?? "ApplyPilot",
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ScholarshipOwl apply failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch all scholarships by paginating through list */
export async function listAllScholarships(): Promise<ScholarshipOwlListItem[]> {
  const all: ScholarshipOwlListItem[] = [];
  let page = 1;
  const size = 100;
  while (true) {
    const { data } = await listScholarships(page, size);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < size) break;
    page++;
  }
  return all;
}
