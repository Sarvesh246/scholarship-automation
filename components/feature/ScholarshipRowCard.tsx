import { memo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scholarship, ScholarshipMatchResult } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { formatCategoryDisplay, decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getQualityTier, getQualityWarnings } from "@/lib/scholarshipQuality";
import { QualityScoreBadge } from "@/components/ui/QualityScoreBadge";
import { getEffortTier, isStale } from "@/lib/opportunityScore";

interface Props {
  scholarship: Scholarship;
  hasApplication?: boolean;
  onStartApplication?: (scholarship: Scholarship) => void | Promise<void>;
  matchResult?: ScholarshipMatchResult;
  /** When true, card gets a green border glow (Greenlight mode). */
  greenlightHighlight?: boolean;
  /** When true, show "High ROI" opportunity badge. */
  showHighROI?: boolean;
}

export const ScholarshipRowCard = memo(function ScholarshipRowCard({
  scholarship,
  hasApplication = false,
  onStartApplication,
  matchResult,
  greenlightHighlight = false,
  showHighROI = false,
}: Props) {
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  const deadline = scholarship.deadline
    ? new Date(scholarship.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const isExpired = !!scholarship.expiredAt;
  const isRecurring = !!scholarship.recurring;
  const nextStart = scholarship.nextStart
    ? new Date(scholarship.nextStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const qualityTier = scholarship.qualityTier ?? getQualityTier(scholarship.qualityScore);
  const warnings = getQualityWarnings(scholarship);
  const effortTier = getEffortTier(scholarship.estimatedTime);
  const stale = isStale(scholarship);

  const handleStart = useCallback(() => {
    if (hasApplication) {
      router.push(`/app/applications/${scholarship.id}`);
      return;
    }
    if (onStartApplication) {
      setStarting(true);
      void Promise.resolve(onStartApplication(scholarship)).finally(() => setStarting(false));
    } else {
      router.push(`/app/applications/${scholarship.id}`);
    }
  }, [hasApplication, scholarship, onStartApplication, router]);

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        greenlightHighlight ? "border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/10 shadow-lg" : "border-[var(--border)] bg-[var(--surface)] hover:border-amber-500/25"
      } ${isExpired ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/scholarships/${scholarship.id}`}
            className="font-semibold hover:text-amber-400 transition-colors"
          >
            {displayScholarshipTitle(scholarship.title)}
          </Link>
          {scholarship.verificationStatus === "approved" && (
            <span title="Screened by our quality checks">
              <Badge variant="success">Verified</Badge>
            </span>
          )}
          {(scholarship.qualityScore ?? 0) > 0 && (
            <QualityScoreBadge scholarship={scholarship} compact className="shrink-0" />
          )}
          {qualityTier === "medium" && (scholarship.qualityScore ?? 0) <= 0 && (
            <span title={warnings.length ? warnings.join(" · ") : "Moderate quality"}>
              <Badge variant="info" className="cursor-help">Quality</Badge>
            </span>
          )}
          {qualityTier === "low" && scholarship.verificationStatus !== "approved" && (
            <span title={warnings.length ? warnings.join(" · ") : "Lower quality"}>
              <Badge variant="warning" className="cursor-help">Lower quality</Badge>
            </span>
          )}
          {matchResult && matchResult.eligibilityStatus === "eligible" && (
            <Badge variant="success">Eligible</Badge>
          )}
          {matchResult && matchResult.eligibilityStatus === "almost_eligible" && (
            <span title={matchResult.almostEligibleReason ?? matchResult.missingRequirements?.join(", ")}>
              <Badge variant="info" className="cursor-help">Almost Eligible</Badge>
            </span>
          )}
          {scholarship.featured && (
            <Badge variant="success">Featured</Badge>
          )}
          {showHighROI && (
            <Badge variant="success">High ROI</Badge>
          )}
          {scholarship.displayCategory === "sweepstakes" && (
            <Badge variant="info">Sweepstakes</Badge>
          )}
          {isExpired && (
            <Badge variant="danger">Expired</Badge>
          )}
          {isRecurring && !isExpired && (
            <Badge variant="info">
              Recurring{nextStart ? ` · Next: ${nextStart}` : ""}
            </Badge>
          )}
        </div>
        <p className="text-xs text-[var(--muted-2)]">
          {decodeHtmlEntities(scholarship.sponsor)}
        </p>
        <div className="flex items-center gap-4 flex-wrap text-xs mt-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--muted-2)]" title="Award amount">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <span className={`font-semibold ${(scholarship.amount ?? 0) > 0 ? "text-emerald-500 dark:text-emerald-400 text-base" : "text-[var(--muted)]"}`}>
              {(scholarship.amount ?? 0) > 0 ? `$${(scholarship.amount ?? 0).toLocaleString()}` : "Varies"}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--muted)]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {scholarship.estimatedTime ?? "—"}
            {effortTier && (
              <span className="text-[10px] text-[var(--muted-2)]">
                · {effortTier === "easy" ? "Easy" : effortTier === "medium" ? "Medium" : "Heavy"}
              </span>
            )}
          </span>
          <span className="text-[var(--muted-2)]">📅 {deadline}</span>
          {stale && (
            <span className="text-[10px] text-amber-500/90" title="Listing not recently updated">Stale</span>
          )}
        </div>
        {matchResult && matchResult.reasons.length > 0 && (
          <p className="text-[11px] text-emerald-400/90 mt-0.5">
            Matched because: {matchResult.reasons.slice(0, 4).join(", ")}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(scholarship.normalized?.requirements ?? []).slice(0, 4).map((req) => (
            <Tag key={req}>{req}</Tag>
          ))}
          {(scholarship.categoryTags ?? []).map((tag) => (
            <Tag key={tag}>{formatCategoryDisplay(tag)}</Tag>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {matchResult && matchResult.matchScore > 0 && (
          <span
            className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1"
            title="Match score from your profile"
          >
            {matchResult.matchScore}% match
          </span>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleStart}
          disabled={starting || isExpired}
        >
          {starting ? "Starting…" : hasApplication ? "Continue" : isExpired ? "Expired" : "Start"}
        </Button>
      </div>
    </div>
  );
});
