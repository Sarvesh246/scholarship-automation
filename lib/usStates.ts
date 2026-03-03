/**
 * US states and territories for state dropdown/combobox.
 * Code is 2-letter uppercase (used in profile and matching).
 */
export interface UsState {
  code: string;
  name: string;
}

export const US_STATES: UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "AS", name: "American Samoa" },
  { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
];

/** Common aliases for state lookup (normalized uppercase) -> state code. */
const STATE_ALIASES: Record<string, string> = {
  "D.C.": "DC",
  "DC": "DC",
  "WASHINGTON D.C.": "DC",
  "WASHINGTON DC": "DC",
  "DISTRICT OF COLUMBIA": "DC",
};

function normalizeStateQuery(q: string): string {
  return q.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Find state by code (case-insensitive) or by name (partial match). */
export function findState(query: string): UsState | undefined {
  if (!query || !query.trim()) return undefined;
  const normalized = normalizeStateQuery(query);
  const aliasCode = STATE_ALIASES[normalized];
  if (aliasCode) return US_STATES.find((s) => s.code === aliasCode);
  if (normalized.length === 2) return US_STATES.find((s) => s.code === normalized);
  const lower = query.trim().toLowerCase();
  return US_STATES.find((s) => s.name.toLowerCase().startsWith(lower) || s.name.toLowerCase().includes(lower));
}

/** Filter states by typed query (code or name). */
export function filterStates(query: string): UsState[] {
  if (!query || !query.trim()) return US_STATES;
  const normalized = normalizeStateQuery(query);
  const aliasCode = STATE_ALIASES[normalized];
  if (aliasCode) {
    const aliasState = US_STATES.find((s) => s.code === aliasCode);
    if (aliasState) return [aliasState];
  }
  if (normalized.length === 2) {
    const byCode = US_STATES.find((s) => s.code === normalized);
    if (byCode) return [byCode];
  }
  const lower = query.trim().toLowerCase();
  return US_STATES.filter(
    (s) =>
      s.code === normalized ||
      s.name.toLowerCase().startsWith(lower) ||
      s.name.toLowerCase().includes(lower)
  );
}
