# Average profile that shows Greenlight & Top 3 matches

The matching engine uses **three layers** to produce a per-scholarship result:

1. **Hard eligibility (gate)** — Eligible / Ineligible / **Unknown** (when data is missing). Missing data is never treated as a fail; we mark **Unknown** so Greenlight can still show the scholarship.
2. **Soft fit (score)** — A weighted 0–100 score from profile vs. scholarship (location, education, GPA, major, preferences, etc.).
3. **Completion readiness** — Small penalty when the user hasn’t filled profile fields the scholarship needs (e.g. transcript required but no GPA).

**Output per scholarship:** `eligibilityStatus`, `matchPercent` (0–100), `reasons`, `missingProfileFields`. Greenlight shows only **eligible** and, by default, **unknown**; it never shows **ineligible**. Use the “Hide scholarships with unknown eligibility” toggle to exclude unknown when desired.

Thresholds:

- **Greenlight “strong”:** score ≥ **55%** and status eligible/almost_eligible (or unknown with score ≥ 55%)
- **Greenlight “near”:** score 40–54% when “Show Near Matches” is on
- **Top 3 recommended:** eligible, almost_eligible, or may_not_be_eligible with score ≥ 35%

**Matching runs for everyone:** signed-in and signed-out users both get match results (anonymous users use a default profile). So Greenlight and Top 3 can show even before sign-in.

Below is an **average profile** that should reliably see matches. Filling **state + education level + one major** improves scores; when a scholarship has no/minimal constraints we treat eligibility as **unknown** and give a **floor score (e.g. 50)** so the user never sees “0 matches” just because data is missing.

---

## Recommended “average” profile (shows matches)

| Field | Example | Why it matters |
|-------|---------|-----------------|
| **State** | `"CA"` or `"TX"` | +15 when scholarship has state list or is open to all. Stored in `location.state` or `demographics.state`. |
| **Education level** | `"college"` or `"high_school"` or `"grad"` | +20 when it matches; required to pass the gate when a scholarship restricts by level. |
| **Major** | One of: `intendedMajors: ["Biology"]` or `academics.major: "Computer Science"` or `majorsFreeText: "Nursing"` | +25 (or +28 for a specific match). Drives strong match scores. |
| **Graduation year** (optional) | `"2026"` | Inferred grade level (e.g. Senior) and can help education level; adds to reasons. |
| **GPA** (optional) | `"3.5"` with `gpaScale: "4.0"` | Only used when a scholarship has a minimum GPA; can trigger gate fail if below. |

**Minimal “still see something” profile:**  
If the catalog has many open-to-all scholarships (e.g. fallback normalized with `*`), even an **empty or minimal profile** gets a **floor score of 50** for those, so the user can still see Top 3 and Greenlight “near” matches. For a full experience, **state + education level + major** is the target.

---

## Example profile (JSON-like)

Use this as a reference for an “average” user that should see Greenlight and Top 3:

```json
{
  "academics": {
    "major": "Biology",
    "graduationYear": "2026",
    "gpa": "3.4",
    "gpaScale": "4.0"
  },
  "location": {
    "state": "CA",
    "country": "US"
  },
  "educationLevel": "college",
  "intendedMajors": ["Biology"],
  "timeBudgetPreference": "medium",
  "essayPreference": true,
  "needBasedInterest": false,
  "activities": [],
  "awards": [],
  "financial": {}
}
```

**Even simpler (still shows matches):**

```json
{
  "academics": {},
  "location": { "state": "TX" },
  "educationLevel": "college",
  "intendedMajors": ["Computer Science"],
  "activities": [],
  "awards": [],
  "financial": {}
}
```

---

## How the score is built (recap)

**Weights (total 100):**

- Location fit: 15  
- Education level / grad year fit: 20  
- GPA fit: 15  
- Major fit: 15  
- Need-based preference fit: 10  
- Essay willingness fit: 10  
- Effort/time budget fit: 10  
- Bonus (activities/awards): 5  

**Eligibility multiplier:** eligible × 1.0, unknown × 0.75, ineligible → 0%. So unknown scholarships can still show 40–70% match instead of 0.

Gate-passing or open scholarships get a **minimum score** when the raw total is low, so sparse profiles still see matches. Completion readiness applies a small penalty when required fields (e.g. transcript, activities) are missing.

---

## Where this is used

- **Dashboard:** “Top recommended for you” (top 3 by score); “Curated for you” count uses the same Greenlight rules.  
- **Scholarships page:** Greenlight filter and “Near Matches” use the same thresholds (55% and 40%).  
- **Match engine:** `lib/matchEngine.ts` — `buildUserSignals(profile)`, `computeMatch()`, `GREENLIGHT_MIN_SCORE`, `NEAR_MATCH_MIN_SCORE`.
