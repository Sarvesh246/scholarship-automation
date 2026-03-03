/**
 * Common major abbreviations → full name for display and matching.
 * User can type "CS" or "Bio"; we expand to "Computer Science" / "Biology" for pills and matching.
 */
const ABBREVIATIONS: Record<string, string> = {
  CS: "Computer Science",
  CE: "Computer Engineering",
  CIS: "Computer Information Systems",
  IT: "Information Technology",
  EE: "Electrical Engineering",
  ME: "Mechanical Engineering",
  CE_ENGR: "Civil Engineering",
  ChemE: "Chemical Engineering",
  BME: "Biomedical Engineering",
  Bio: "Biology",
  Biochem: "Biochemistry",
  Chem: "Chemistry",
  Physics: "Physics",
  Math: "Mathematics",
  Stats: "Statistics",
  Psych: "Psychology",
  Soc: "Sociology",
  PoliSci: "Political Science",
  Econ: "Economics",
  Bus: "Business",
  MBA: "Business Administration",
  Fin: "Finance",
  Acct: "Accounting",
  Mktg: "Marketing",
  Mgmt: "Management",
  Nursing: "Nursing",
  PreMed: "Pre-Medicine",
  PreLaw: "Pre-Law",
  PreVet: "Pre-Veterinary",
  Eng: "English",
  Hist: "History",
  Phil: "Philosophy",
  Art: "Art",
  Music: "Music",
  Theatre: "Theatre",
  Film: "Film",
  Comm: "Communications",
  Journ: "Journalism",
  Educ: "Education",
  EnvSci: "Environmental Science",
  EnvStud: "Environmental Studies",
  Crim: "Criminal Justice",
  CrimJust: "Criminal Justice",
  SW: "Social Work",
  PT: "Physical Therapy",
  OT: "Occupational Therapy",
  Pharm: "Pharmacy",
  Arch: "Architecture",
  Agri: "Agriculture",
  SportMgmt: "Sports Management",
  Kines: "Kinesiology",
  Nutr: "Nutrition",
  PubHealth: "Public Health",
  IntlRel: "International Relations",
  Anthro: "Anthropology",
  Geo: "Geography",
  GeoEng: "Geological Engineering",
  Aero: "Aerospace Engineering",
  IndEng: "Industrial Engineering",
  DataSci: "Data Science",
  Cybersec: "Cyber Security",
  GameDev: "Game Development",
  GraphicDesign: "Graphic Design",
  InteriorDesign: "Interior Design",
  Fashion: "Fashion Design",
  FilmProd: "Film Production",
  Anim: "Animation",
  Photo: "Photography",
};

/** Normalize for lookup: uppercase, trim, remove extra spaces. */
function normalizeKey(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Expand abbreviation to full name if known; otherwise return trimmed input with first letter capitalized.
 * Handles "CS" → "Computer Science", "Bio" → "Biology", "computer science" → "Computer Science".
 */
export function expandMajor(input: string): string {
  const trimmed = normalizeKey(input);
  if (!trimmed) return "";
  const byAbbr = ABBREVIATIONS[trimmed];
  if (byAbbr) return byAbbr;
  const byAbbrLower = Object.entries(ABBREVIATIONS).find(([k]) => k.toLowerCase() === trimmed.toLowerCase());
  if (byAbbrLower) return byAbbrLower[1];
  const byValueLower = Object.values(ABBREVIATIONS).find((v) => v.toLowerCase() === trimmed.toLowerCase());
  if (byValueLower) return byValueLower;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** All known full names (for autocomplete suggestions). */
export function getMajorSuggestions(): string[] {
  return [...new Set(Object.values(ABBREVIATIONS))].sort();
}
