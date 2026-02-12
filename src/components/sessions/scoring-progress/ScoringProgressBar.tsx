"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScoringProgressBarProps {
  totalCriteria: number;
  scoredCriteria: number;
  requiredCriteria: number;
  scoredRequired: number;
  compact?: boolean;
}

export function ScoringProgressBar({
  totalCriteria,
  scoredCriteria,
  requiredCriteria,
  scoredRequired,
  compact = false,
}: ScoringProgressBarProps) {
  const progressPercent =
    totalCriteria > 0 ? (scoredCriteria / totalCriteria) * 100 : 0;
  const requiredProgressPercent =
    requiredCriteria > 0 ? (scoredRequired / requiredCriteria) * 100 : 100;

  const allRequiredScored = scoredRequired >= requiredCriteria;
  const allScored = scoredCriteria >= totalCriteria;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Progress
          value={progressPercent}
          className="h-2 w-24"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {scoredCriteria}/{totalCriteria}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className={cn(
            "font-medium",
            allScored ? "text-emerald-500" : "text-foreground"
          )}>
            {scoredCriteria}/{totalCriteria} criteria
          </span>
        </div>
        <Progress
          value={progressPercent}
          className={cn(
            "h-2",
            allScored && "[&>div]:bg-emerald-500"
          )}
        />
      </div>

      {/* Required Progress */}
      {requiredCriteria > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required Criteria</span>
            <span className={cn(
              "font-medium",
              allRequiredScored
                ? "text-emerald-500"
                : scoredRequired > 0
                ? "text-amber-500"
                : "text-foreground"
            )}>
              {scoredRequired}/{requiredCriteria} scored
            </span>
          </div>
          <Progress
            value={requiredProgressPercent}
            className={cn(
              "h-2",
              allRequiredScored
                ? "[&>div]:bg-emerald-500"
                : "[&>div]:bg-amber-500"
            )}
          />
        </div>
      )}
    </div>
  );
}
