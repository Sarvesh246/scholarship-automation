/**
 * Application breakdown for the execution engine: completion %, tasks, effort, ROI.
 * Powers "You are X% complete" and checklist-style summary in the application workspace.
 */
import type { Application, Scholarship } from "@/types";
import { getEffortTier, getROIScore, parseEffortMinutes } from "@/lib/opportunityScore";
import { getQualityTier } from "@/lib/scholarshipQuality";

export interface ApplicationBreakdown {
  completionPct: number;
  deadline: string;
  deadlineFormatted: string;
  effortLabel: string;
  effortTier: "easy" | "medium" | "heavy";
  effortMinutes: number;
  requiredEssays: number;
  completedEssays: number;
  requiredDocs: string[];
  docsUploaded: string[];
  awardAmount: number;
  roiScore: number;
  qualityTier: "high" | "medium" | "low";
  checklistTasks: { id: string; label: string; completed: boolean }[];
}

export function getApplicationBreakdown(
  scholarship: Scholarship,
  application: Application
): ApplicationBreakdown {
  const prompts = scholarship.prompts ?? [];
  const docsRequired = application.docsRequired ?? ["Transcript", "Resume"];
  const docsUploaded = application.docsUploaded ?? [];
  const promptResponses = application.promptResponses ?? [];
  const completedEssays = promptResponses.filter((r) => (r.response ?? "").trim().length > 0).length;
  const completionPct = application.progress ?? 0;

  const effortMinutes = parseEffortMinutes(scholarship.estimatedTime);
  const effortTier = getEffortTier(scholarship.estimatedTime);
  const effortLabel = scholarship.estimatedTime ?? (effortMinutes <= 30 ? "~30 min" : effortMinutes <= 60 ? "~1 hour" : `${Math.round(effortMinutes / 60)}–${Math.round(effortMinutes / 60) + 1} hours`);

  const deadline = scholarship.deadline ?? "";
  const deadlineFormatted = deadline
    ? new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const roiScore = getROIScore(scholarship);
  const qualityTier = getQualityTier(scholarship.qualityScore);

  const checklistTasks: { id: string; label: string; completed: boolean }[] = [
    {
      id: "eligibility",
      label: "Review eligibility requirements",
      completed: (scholarship.eligibilityTags ?? []).length === 0 || completionPct > 0,
    },
    {
      id: "documents",
      label: `Documents: ${docsUploaded.length}/${docsRequired.length} uploaded`,
      completed: docsUploaded.length >= docsRequired.length,
    },
    ...(prompts.length > 0
      ? [{
          id: "essays",
          label: `Essays: ${completedEssays}/${prompts.length} completed`,
          completed: completedEssays >= prompts.length,
        }]
      : []),
    {
      id: "final",
      label: "Ready to submit",
      completed: completionPct >= 100,
    },
  ];

  return {
    completionPct,
    deadline,
    deadlineFormatted,
    effortLabel,
    effortTier,
    effortMinutes,
    requiredEssays: prompts.length,
    completedEssays,
    requiredDocs: docsRequired,
    docsUploaded,
    awardAmount: typeof scholarship.amount === "number" ? scholarship.amount : 0,
    roiScore,
    qualityTier,
    checklistTasks,
  };
}
