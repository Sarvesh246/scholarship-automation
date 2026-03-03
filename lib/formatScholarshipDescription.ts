/**
 * Normalize and format scholarship description text for display and storage.
 * Fixes run-together words, duplicate paragraphs, missing spaces after labels,
 * and trailing junk so overviews read cleanly and professionally.
 */

/**
 * Format raw description text: fix spacing, remove duplicates, normalize structure.
 */
export function formatScholarshipDescription(raw: string | undefined | null): string {
  if (raw == null || typeof raw !== "string") return "";
  let s = raw.trim();
  if (!s) return "";

  // Normalize line endings and collapse excessive blank lines
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  // Fix run-together label + value: "Funded byX" -> "Funded by X", "Education levelHigh" -> "Education level: High"
  const labelSpacePatterns: [RegExp, string][] = [
    [/Funded\s+by(?=[A-Z])/gi, "Funded by "],
    [/Education\s+level(?=[A-Za-z])/gi, "Education level: "],
    [/Eligibility(?=[A-Za-z])/g, "Eligibility: "],
    [/Deadline(?=[A-Za-z0-9])/g, "Deadline: "],
    [/Amount(?=[A-Za-z0-9$])/g, "Amount: "],
    [/Award(?=[A-Za-z0-9$])/g, "Award: "],
    [/Sponsor(?=[A-Za-z])/g, "Sponsor: "],
    [/Requirements?(?=[A-Za-z])/g, "Requirements: "],
    [/Open\s+to(?=[A-Z])/gi, "Open to "],
    [/Applicant(?=[a-z])/g, "Applicant "],
  ];
  for (const [re, replacement] of labelSpacePatterns) {
    s = s.replace(re, replacement);
  }

  // Insert space before capital letter when preceded by lowercase (e.g. "byDaniel" -> "by Daniel")
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Insert space after period or colon when not followed by space
  s = s.replace(/([.:])([A-Za-z])/g, "$1 $2");

  // Collapse multiple spaces
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n /g, "\n").replace(/ \n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  // Remove duplicate consecutive paragraphs (exact or nearly exact)
  const paragraphs = s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of paragraphs) {
    const key = p.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  s = unique.join("\n\n");

  // Trim trailing single character or punctuation (e.g. "UndergraduateA" -> "Undergraduate" at end)
  s = s.replace(/\s+[A-Za-z]\s*$/, "").trim();
  s = s.replace(/[,\s]+$/, "").trim();

  // Ensure first letter is capitalized
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  return s.trim();
}

/**
 * Use when saving or syncing a scholarship. Returns the description to store.
 */
export function normalizeDescriptionForSave(description: string | undefined | null): string {
  return formatScholarshipDescription(description);
}
