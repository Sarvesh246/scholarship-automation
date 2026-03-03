import { memo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scholarship, ScholarshipMatchResult } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { formatCategoryDisplay, decodeHtmlEntities } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Props {
  scholarship: Scholarship;
  hasApplication?: boolean;
  onStartApplication?: (scholarship: Scholarship) => Promise<void>;
  matchResult?: ScholarshipMatchResult;
}

export const ScholarshipRowCard = memo(function ScholarshipRowCard({
  scholarship,
  hasApplication = false,
  onStartApplication,
  matchResult,
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

  const handleStart = useCallback(() => {
    if (hasApplication) {
      router.push(`/app/applications/${scholarship.id}`);
      return;
    }
    if (onStartApplication) {
      setStarting(true);
      onStartApplication(scholarship).finally(() => setStarting(false));
    } else {
      router.push(`/app/applications/${scholarship.id}`);
    }
  }, [hasApplication, scholarship, onStartApplication, router]);

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/25 hover:shadow-md ${
        isExpired ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/scholarships/${scholarship.id}`}
            className="font-semibold hover:text-amber-400 transition-colors"
          >
            {decodeHtmlEntities(scholarship.title)}
          </Link>
          {scholarship.verificationStatus === "approved" && (
            <span title="Screened by our quality checks">
              <Badge variant="success">Verified</Badge>
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
        {matchResult && matchResult.reasons.length > 0 && (
          <p className="text-[11px] text-emerald-400/90">
            Why: {matchResult.reasons.slice(0, 4).join(", ")}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--muted-2)]" title="Award amount">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <span className={`font-semibold ${(scholarship.amount ?? 0) > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-[var(--muted)]"}`}>
              {(scholarship.amount ?? 0) > 0 ? `$${(scholarship.amount ?? 0).toLocaleString()}` : "Varies"}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--muted)]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {scholarship.estimatedTime ?? "—"}
          </span>
          <span className="text-[var(--muted-2)]">Deadline: {deadline}</span>
        </div>
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
