"use client";

import { CheckCircle2, XCircle, AlertTriangle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SessionScoreResult } from "@/types/database";
import { cn } from "@/lib/utils";

interface RealTimeScorePreviewProps {
  projectedScore: SessionScoreResult | null;
  isPassing: boolean;
  passThreshold: number;
  autoFailTriggered: boolean;
  scoredCriteria: number;
  totalCriteria: number;
  compact?: boolean;
}

export function RealTimeScorePreview({
  projectedScore,
  isPassing,
  passThreshold,
  autoFailTriggered,
  scoredCriteria,
  totalCriteria,
  compact = false,
}: RealTimeScorePreviewProps) {
  const hasScore = projectedScore !== null && scoredCriteria > 0;
  const percentage = projectedScore?.percentage_score ?? 0;

  // Determine status
  let status: "passing" | "failing" | "auto-fail" | "pending" = "pending";
  if (!hasScore) {
    status = "pending";
  } else if (autoFailTriggered) {
    status = "auto-fail";
  } else if (isPassing) {
    status = "passing";
  } else {
    status = "failing";
  }

  const statusConfig = {
    passing: {
      icon: CheckCircle2,
      label: "Passing",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    failing: {
      icon: XCircle,
      label: "Below Threshold",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    "auto-fail": {
      icon: AlertTriangle,
      label: "Auto-Fail Triggered",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    pending: {
      icon: Minus,
      label: "Not Started",
      color: "text-muted-foreground",
      bgColor: "bg-muted/30",
      borderColor: "border-muted",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-bold", config.color)}>
          {hasScore ? `${Math.round(percentage)}%` : "—"}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-xs",
            config.color,
            config.borderColor
          )}
        >
          <Icon className="h-3 w-3" />
          {status === "auto-fail" ? "Auto-Fail" : config.label}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Projected Score</p>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold", config.color)}>
              {hasScore ? `${Math.round(percentage)}%` : "—"}
            </span>
            {hasScore && (
              <span className="text-sm text-muted-foreground">
                / {passThreshold}% to pass
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              config.color,
              config.borderColor
            )}
          >
            <Icon className="h-4 w-4" />
            {config.label}
          </Badge>
          {hasScore && (
            <span className="text-xs text-muted-foreground">
              Based on {scoredCriteria}/{totalCriteria} scored
            </span>
          )}
        </div>
      </div>

      {/* Score breakdown for non-compact view */}
      {hasScore && projectedScore && (
        <div className="mt-3 pt-3 border-t border-current/10 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total Score</p>
            <p className="font-medium">
              {projectedScore.total_score.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Possible</p>
            <p className="font-medium">
              {projectedScore.total_possible.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <p className="font-medium capitalize">
              {projectedScore.pass_status}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
