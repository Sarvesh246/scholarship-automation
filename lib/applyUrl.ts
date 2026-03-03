/**
 * Resolve the URL where a student can apply for a scholarship.
 * Prefer stored applicationUrl; fall back to description link or known source URLs.
 */
import type { Scholarship } from "@/types";

const HTTPS_REGEX = /https?:\/\/[^\s)\]'"]+/g;

/** Extract first valid https? URL from text. */
function extractFirstUrl(text: string | undefined | null): string | null {
  if (!text || typeof text !== "string") return null;
  const m = text.match(HTTPS_REGEX);
  if (!m?.length) return null;
  const url = m[0].replace(/[)\]\s'"]+$/, "").trim();
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Returns the URL where the student can apply for this scholarship.
 * - Uses scholarship.applicationUrl if set and looks like a real URL.
 * - For grants_gov: builds Grants.gov view-opportunity URL from id (grants-gov-123 -> oppId 123).
 * - For scholarship_owl: optional external link (e.g. Owl's scholarship page); we prefer in-app apply.
 * - Otherwise extracts first https URL from description.
 * Returns null if no reliable URL can be determined.
 */
export function getApplyUrl(scholarship: Scholarship | null | undefined): string | null {
  if (!scholarship) return null;

  const stored = scholarship.applicationUrl?.trim();
  if (stored) {
    if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
  }

  const source = (scholarship.source ?? "").toLowerCase();
  const id = scholarship.id ?? "";

  if (source === "grants_gov" && id.startsWith("grants-gov-")) {
    const oppId = id.replace(/^grants-gov-/, "").trim();
    if (oppId) {
      return `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${oppId}`;
    }
  }

  if (source === "scholarship_owl" && id) {
    return `https://www.scholarshipowl.com/app/scholarship-view/${encodeURIComponent(id)}`;
  }

  return extractFirstUrl(scholarship.description) ?? null;
}

/** Returns true if the scholarship has a known apply URL (stored or derivable). */
export function hasApplyUrl(scholarship: Scholarship | null | undefined): boolean {
  return getApplyUrl(scholarship) != null;
}
