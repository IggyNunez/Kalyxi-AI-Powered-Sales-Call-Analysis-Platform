"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AutoFailAlertProps {
  autoFailCriteriaIds: string[];
  autoFailCriteriaNames: string[];
  onViewCriteria?: (criteriaId: string) => void;
  compact?: boolean;
}

export function AutoFailAlert({
  autoFailCriteriaIds,
  autoFailCriteriaNames,
  onViewCriteria,
  compact = false,
}: AutoFailAlertProps) {
  if (autoFailCriteriaIds.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">
          Auto-fail: {autoFailCriteriaNames.slice(0, 2).join(", ")}
          {autoFailCriteriaNames.length > 2 &&
            ` +${autoFailCriteriaNames.length - 2} more`}
        </span>
      </div>
    );
  }

  return (
    <Alert
      variant="destructive"
      className={cn(
        "border-red-500/50 bg-red-500/10",
        "[&>svg]:text-red-500"
      )}
    >
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-red-500 font-semibold">
        Auto-Fail Triggered
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm text-red-400">
          The following criteria have triggered an automatic fail condition.
          Review and adjust scores if needed.
        </p>

        <ul className="space-y-2">
          {autoFailCriteriaIds.map((id, index) => (
            <li
              key={id}
              className="flex items-center justify-between gap-2 p-2 bg-red-500/5 rounded-md border border-red-500/20"
            >
              <span className="text-sm font-medium text-red-300">
                {autoFailCriteriaNames[index]}
              </span>
              {onViewCriteria && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewCriteria(id)}
                  className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  View
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        <p className="text-xs text-red-400/80">
          This session will be marked as Failed regardless of the total score.
        </p>
      </AlertDescription>
    </Alert>
  );
}
