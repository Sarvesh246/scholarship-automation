import type { Essay } from "@/types";
import { essays as defaultEssays } from "@/data/mockData";

const STORAGE_KEY = "scholarship-app-essays";

function getStored(): Essay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Essay[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(list: Essay[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

/**
 * Get all essays: from localStorage if any, otherwise seed from mock data once.
 */
export function getEssays(): Essay[] {
  const stored = getStored();
  if (stored.length > 0) return stored;
  setStored(defaultEssays);
  return defaultEssays;
}

/**
 * Get one essay by id. Checks localStorage first, then mock data.
 */
export function getEssay(id: string): Essay | null {
  const list = getEssays();
  return list.find((e) => e.id === id) ?? null;
}

function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Save an essay (create or update). Assigns id and updatedAt if new.
 */
export function saveEssay(essay: {
  id?: string;
  title: string;
  tags: string[];
  content: string;
}): Essay {
  const list = getStored().length > 0 ? getStored() : [...defaultEssays];
  const now = new Date().toISOString();
  const updated: Essay = {
    id: essay.id ?? `essay-${Date.now()}`,
    title: essay.title || "Untitled essay",
    tags: essay.tags?.length ? essay.tags : ["General"],
    wordCount: wordCount(essay.content ?? ""),
    updatedAt: now,
    content: essay.content ?? ""
  };
  const idx = list.findIndex((e) => e.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.push(updated);
  }
  setStored(list);
  return updated;
}

/**
 * Delete an essay by id.
 */
export function deleteEssay(id: string): void {
  const list = getStored();
  const next = list.filter((e) => e.id !== id);
  setStored(next);
}
