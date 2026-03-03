import type { Essay } from "@/types";
import type { Scholarship } from "@/types";

const KEYWORD_MAP: Record<string, string[]> = {
  leadership: ["leadership", "leader", "lead"],
  stem: ["stem", "science", "technology", "engineering", "math", "research"],
  community: ["community", "volunteer", "service", "impact"],
  arts: ["arts", "art", "creative", "music", "writing"],
  "financial need": ["financial", "need", "money", "afford", "economic"],
  general: ["general", "personal", "experience", "goals"],
};

function extractKeywords(text: string): Set<string> {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  const keywords = new Set<string>();
  for (const [tag, variants] of Object.entries(KEYWORD_MAP)) {
    if (variants.some((v) => lower.includes(v))) keywords.add(tag);
  }
  for (const w of words) {
    const cleaned = w.replace(/[^a-z]/g, "");
    if (cleaned.length >= 4) keywords.add(cleaned);
  }
  return keywords;
}

function scoreEssay(essay: Essay, promptKeywords: Set<string>, categoryTags: string[]): number {
  let score = 0;
  const essayTags = (essay.tags ?? []).map((t) => t.toLowerCase());
  const essayTitle = (essay.title ?? "").toLowerCase();
  const raw = (essay.content ?? "").replace(/<[^>]*>/g, " ");
  const essayContent = raw.toLowerCase().slice(0, 500);

  for (const kw of promptKeywords) {
    if (essayTags.some((t) => t.includes(kw) || kw.includes(t))) score += 3;
    if (essayTitle.includes(kw)) score += 2;
    if (essayContent.includes(kw)) score += 1;
  }
  for (const cat of categoryTags) {
    const c = cat.toLowerCase();
    if (essayTags.some((t) => t.includes(c) || c.includes(t))) score += 2;
  }
  return score;
}

/** Return essays that might fit a prompt, sorted by relevance. */
export function matchEssaysToPrompt(
  essays: Essay[],
  prompt: string,
  scholarship?: Scholarship
): Essay[] {
  const promptKeywords = extractKeywords(prompt);
  const categoryTags = scholarship?.categoryTags ?? [];
  const scored = essays
    .map((e) => ({ essay: e, score: scoreEssay(e, promptKeywords, categoryTags) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.essay).slice(0, 5);
}

/** Return essays that might fit a scholarship (based on prompts + categories). */
export function matchEssaysToScholarship(essays: Essay[], scholarship: Scholarship): Essay[] {
  const prompts = scholarship.prompts ?? [];
  const allKeywords = new Set<string>();
  for (const p of prompts) {
    extractKeywords(p).forEach((k) => allKeywords.add(k));
  }
  (scholarship.categoryTags ?? []).forEach((c) =>
    allKeywords.add(c.toLowerCase())
  );
  const scored = essays
    .map((e) => ({
      essay: e,
      score: scoreEssay(e, allKeywords, scholarship.categoryTags ?? []),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.essay).slice(0, 5);
}
