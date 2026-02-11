"use client";

import {
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Session, Template, Score, CriteriaGroup, Criteria } from "@/types/database";

interface ScoreSummaryProps {
  session: Session;
  template: Template;
  scores: Score[];
  criteria: Criteria[];
  groups: CriteriaGroup[];
}

export default function ScoreSummary({
  session,
  template,
  scores,
  criteria,
  groups,
}: ScoreSummaryProps) {
  // Calculate progress
  const totalCriteria = criteria.length;
  const scoredCriteria = scores.filter((s) => s.value !== null || s.is_na).length;
  const progressPercent =
    totalCriteria > 0 ? (scoredCriteria / totalCriteria) * 100 : 0;

  // Required criteria
  const requiredCriteria = criteria.filter((c) => c.is_required);
  const scoredRequired = requiredCriteria.filter((c) =>
    scores.some((s) => s.criteria_id === c.id && (s.value !== null || s.is_na))
  );
  const allRequiredScored = scoredRequired.length === requiredCriteria.length;

  // Calculate current score
  const totalScore = session.total_score ?? null;
  const passThreshold = template.pass_threshold ?? 70;
  const isPassing = totalScore !== null && totalScore >= passThreshold;

  // Check for auto-fail
  const autoFailTriggered = scores.some((s) => s.is_auto_fail_triggered);

  // Group scores for breakdown
  const groupScores = groups.map((group) => {
    const groupCriteria = criteria.filter((c) => c.group_id === group.id);
    const groupScoreData = scores.filter((s) =>
      groupCriteria.some((c) => c.id === s.criteria_id)
    );
    const totalWeight = groupCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    const earnedWeight = groupScoreData.reduce(
      (sum, s) => sum + (s.weighted_score || 0),
      0
    );
    const percentage =
      totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;

    return {
      group,
      scored: groupScoreData.length,
      total: groupCriteria.length,
      percentage,
    };
  });

  return (
    <div className="space-y-4">
      {/* Main Score Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Score Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Score */}
          <div className="text-center">
            <div
              className={cn(
                "text-5xl font-bold",
                totalScore === null
                  ? "text-muted-foreground"
                  : isPassing && !autoFailTriggered
                    ? "text-emerald-600"
                    : "text-red-600"
              )}
            >
              {totalScore !== null ? `${totalScore.toFixed(1)}%` : "—"}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {totalScore !== null && (
                <>
                  {isPassing && !autoFailTriggered ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/20 text-emerald-600"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Passing
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-red-500/20 text-red-600"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Passing
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Pass threshold indicator */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Pass: {passThreshold}%</span>
              <span>100%</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              {/* Pass threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 z-10"
                style={{ left: `${passThreshold}%` }}
              />
              {/* Score bar */}
              {totalScore !== null && (
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isPassing && !autoFailTriggered
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(totalScore, 100)}%` }}
                />
              )}
            </div>
          </div>

          {/* Auto-fail warning */}
          {autoFailTriggered && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-600 text-sm">
                  Auto-Fail Triggered
                </p>
                <p className="text-xs text-muted-foreground">
                  One or more criteria triggered an automatic failure.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Criteria Scored</span>
              <span className="font-medium">
                {scoredCriteria} / {totalCriteria}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Required criteria */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Required Criteria</span>
              <span
                className={cn(
                  "font-medium",
                  allRequiredScored ? "text-emerald-600" : "text-amber-600"
                )}
              >
                {scoredRequired.length} / {requiredCriteria.length}
              </span>
            </div>
            <Progress
              value={
                requiredCriteria.length > 0
                  ? (scoredRequired.length / requiredCriteria.length) * 100
                  : 100
              }
              className={cn(
                "h-2",
                allRequiredScored ? "" : "[&>div]:bg-amber-500"
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Group Breakdown */}
      {groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Group Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupScores.map(({ group, scored, total, percentage }) => (
              <div key={group.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{group.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {scored}/{total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={total > 0 ? (scored / total) * 100 : 0}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
