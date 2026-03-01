import type { Application } from "@/types";
import { applications as defaultApplications } from "@/data/mockData";

const STORAGE_KEY = "applypilot-applications";

function getStored(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Application[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(list: Application[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

/**
 * Get all applications: from localStorage, or seed from mock data once.
 */
export function getApplications(): Application[] {
  const stored = getStored();
  if (stored.length > 0) return stored;
  setStored(defaultApplications);
  return defaultApplications;
}

/**
 * Get one application by id.
 */
export function getApplication(id: string): Application | null {
  const list = getApplications();
  return list.find((a) => a.id === id) ?? null;
}

/**
 * Add or update an application. If id exists, updates; otherwise appends.
 */
export function saveApplication(app: Application): Application {
  const list = getStored().length > 0 ? getStored() : [...defaultApplications];
  const idx = list.findIndex((a) => a.id === app.id);
  if (idx >= 0) {
    list[idx] = app;
  } else {
    list.push(app);
  }
  setStored(list);
  return app;
}

/**
 * Create a new application for a scholarship (or return existing).
 */
export function ensureApplication(scholarshipId: string, scholarshipDetails?: { docsRequired?: string[] }): Application {
  const list = getApplications();
  const existing = list.find((a) => a.scholarshipId === scholarshipId);
  if (existing) return existing;
  const template = defaultApplications.find((a) => a.scholarshipId === scholarshipId);
  const docsRequired =
    scholarshipDetails?.docsRequired?.length
      ? scholarshipDetails.docsRequired
      : template?.docsRequired ?? ["Transcript", "Resume"];
  const newApp: Application = {
    id: `app-${scholarshipId}`,
    scholarshipId,
    status: "not_started",
    progress: 0,
    nextTask: "Review requirements and prompts",
    docsRequired,
    docsUploaded: [],
    promptResponses: []
  };
  list.push(newApp);
  setStored(list);
  return newApp;
}

/**
 * Update application status (e.g. to submitted).
 */
export function updateApplicationStatus(id: string, status: Application["status"], progress?: number): void {
  const list = getApplications();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], status, progress: progress ?? list[idx].progress };
  setStored(list);
}
