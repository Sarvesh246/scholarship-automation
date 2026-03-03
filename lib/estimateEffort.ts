/**
 * Estimate application effort time from essay prompts and document requirements.
 * Used during sync/scrape to set estimatedTime on scholarships.
 */

/** Extract max word count from a prompt string. Returns 0 if none found. */
function extractWordCountFromPrompt(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const t = text.toLowerCase();
  // "500 words", "up to 500 words", "500-word", "500 word"
  const m1 = t.match(/(?:up to|max(?:imum)?|limit(?:ed)?)?\s*(\d{1,5})\s*[-–]?\s*words?/);
  if (m1) return Math.min(parseInt(m1[1], 10) || 0, 5000);

  // "250-500 words", "250–500", "300 to 500 words"
  const m2 = t.match(/(\d{1,5})\s*[-–to]+\s*(\d{1,5})\s*(?:words?)?/);
  if (m2) return Math.min(Math.max(parseInt(m2[1], 10) || 0, parseInt(m2[2], 10) || 0), 5000);

  // "minimum 250 words", "250 word minimum"
  const m3 = t.match(/(?:minimum|min\.?)\s*(\d{1,5})\s*words?|(\d{1,5})\s*word\s*(?:minimum|min)/);
  if (m3) return Math.min(parseInt(m3[1] || m3[2], 10) || 0, 5000);

  // "2 pages" ≈ 500 words, "1 page" ≈ 250
  const m4 = t.match(/(\d{1,2})\s*pages?/);
  if (m4) return Math.min((parseInt(m4[1], 10) || 1) * 250, 2000);

  // "500 characters" → ~100 words
  const m5 = t.match(/(\d{1,5})\s*characters?/);
  if (m5) return Math.min(Math.ceil((parseInt(m5[1], 10) || 0) / 5), 2000);

  return 0;
}

/** Minutes per essay based on word count. No count = assume 250 words. */
function minutesPerEssay(wordCount: number): number {
  if (wordCount <= 0) return 45; // default
  if (wordCount < 250) return 30;
  if (wordCount < 500) return 45;
  if (wordCount < 1000) return 90;
  return 120;
}

/** Minutes for document gathering (transcript, resume, LOR, etc.). */
function minutesPerDoc(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return count * 15;
  return 45; // cap at 45 min for 3+ docs
}

/** Infer document count from description (transcript, resume, LOR, etc.). */
function inferDocCountFromDescription(desc: string): number {
  if (!desc || typeof desc !== "string") return 0;
  const t = desc.toLowerCase();
  let count = 0;
  if (/\btranscript\b/i.test(t)) count++;
  if (/\bresume\b|\bcv\b/i.test(t)) count++;
  const lorMatch = t.match(/(\d+)\s*letters?\s+of\s+recommendation/);
  if (lorMatch) {
    count += parseInt(lorMatch[1], 10) || 1;
  } else if (/\bletter\s+of\s+recommendation\b|\blor\b|\brecommendation\s+letter\b/i.test(t)) {
    count += 2;
  }
  return Math.min(count, 5);
}

/** Convert total minutes to human-readable string. */
function formatEffort(totalMinutes: number): string {
  if (totalMinutes <= 0) return "30 min";
  if (totalMinutes <= 30) return "30 min";
  if (totalMinutes <= 45) return "30–45 min";
  if (totalMinutes <= 60) return "1 hour";
  if (totalMinutes <= 90) return "1–1.5 hours";
  if (totalMinutes <= 120) return "1.5–2 hours";
  if (totalMinutes <= 180) return "2–3 hours";
  if (totalMinutes <= 240) return "3–4 hours";
  return "4+ hours";
}

export interface EffortInput {
  /** Essay prompts (text). Word counts extracted from prompt text. */
  prompts?: string[];
  /** Number of document requirements (transcript, resume, LOR, etc.). */
  docsCount?: number;
  /** Owl requirement types: "text"|"input"|"link"|"file"|"image". Used to count essays vs docs. */
  requirementTypes?: string[];
  /** Description text to infer doc count (e.g. "transcript, resume, 2 letters"). */
  description?: string;
}

/**
 * Estimate application effort from prompts and document requirements.
 * Guidelines:
 * - Base: 30 min (review, forms, etc.)
 * - Per essay: 30–120 min based on word count (extracted from prompt text)
 * - Per doc: ~15 min (gathering, uploading)
 */
export function estimateEffortTime(input: EffortInput): string {
  const prompts = input.prompts ?? [];
  let docsCount = input.docsCount ?? 0;
  const requirementTypes = input.requirementTypes ?? [];
  if (docsCount === 0 && input.description) {
    docsCount = inferDocCountFromDescription(input.description);
  }

  // If we have requirement types, count file/image as docs; text/input as essays
  let essayCount = prompts.length;
  let docCount = docsCount;
  if (requirementTypes.length > 0 && prompts.length === 0) {
    for (const t of requirementTypes) {
      const type = (t || "").toLowerCase();
      if (type === "file" || type === "image") docCount++;
      else if (type === "text" || type === "essay" || type === "input") essayCount++;
    }
  }

  let total = 30; // base

  // Essay time from prompts
  if (prompts.length > 0) {
    for (const p of prompts) {
      const wc = extractWordCountFromPrompt(p);
      total += minutesPerEssay(wc);
    }
  } else if (essayCount > 0) {
    // No prompt text, assume 1 essay = 45 min each
    total += essayCount * 45;
  }

  // Document time
  total += minutesPerDoc(docCount);

  return formatEffort(total);
}
