/**
 * Registry of inventory/source types for scholarships.
 * Used for tagging scraped content and filtering in admin/UI.
 */
import type { SourceType } from "@/types";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  aggregator: "Aggregator",
  institutional_departmental: "University / Department",
  professional_association: "Professional Association",
  corporate_foundation: "Corporate Foundation",
  municipal: "Municipal / City",
  community_foundation: "Community Foundation",
  research_fellowship: "Research / National Lab",
  arts: "Arts & Cultural",
  civic: "Civic / Policy",
  healthcare: "Healthcare System",
  industry_specific: "Industry / Trade Group",
  sports: "Sports & Athletic",
  faith_based: "Faith-Based",
  local_business: "Chamber / Local Business",
  union: "Labor Union",
  recurring_pending_update: "Recurring (pending update)",
};

/** Scraper id -> default sourceType when that scraper doesn't set it per-item. */
export const SCRAPER_SOURCE_TYPES: Record<string, SourceType> = {
  collegescholarships: "aggregator",
  bold: "aggregator",
  scholarshipscom: "aggregator",
  scholarships360: "aggregator",
  collegedata: "aggregator",
  department_pages: "institutional_departmental",
  professional_associations: "professional_association",
  municipal: "municipal",
  community_foundations: "community_foundation",
  corporate_foundations: "corporate_foundation",
};

export const ALL_SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];
