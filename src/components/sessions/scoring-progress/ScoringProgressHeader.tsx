"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionScoreResult } from "@/types/database";
import { ScoringProgressBar } from "./ScoringProgressBar";
import { RealTimeScorePreview } from "./RealTimeScorePreview";
import { AutoFailAlert } from "./AutoFailAlert";
import { cn } from "@/lib/utils";

interface ScoringProgressHeaderProps {
  // Progress data
  totalCriteria: number;
  scoredCriteria: number;
  requiredCriteria: number;
  scoredRequired: number;

  // Score data
  projectedScore: SessionScoreResult | null;
  isPassing: boolean;
  passThreshold: number;

  // Auto-fail data
  autoFailTriggered: boolean;
  autoFailCriteriaIds: string[];
  autoFailCriteriaNames: string[];

  // Actions
  nextUnscoredId: string | null;
  nextUnscoredRequiredId: string | null;
  onScrollToCriteria?: (criteriaId: string) => void;

  // Reference element for intersection observer
  observeRef?: React.RefObject<HTMLElement | null>;
}

export function ScoringProgressHeader({
  totalCriteria,
  scoredCriteria,
  requiredCriteria,
  scoredRequired,
  projectedScore,
  isPassing,
  passThreshold,
  autoFailTriggered,
  autoFailCriteriaIds,
  autoFailCriteriaNames,
  nextUnscoredId,
  nextUnscoredRequiredId,
  onScrollToCriteria,
  observeRef,
}: ScoringProgressHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Use Intersection Observer to detect when header should become sticky
  useEffect(() => {
    if (!observeRef?.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the observed element leaves viewport, show sticky header
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px", // Account for top navbar
      }
    );

    observer.observe(observeRef.current);

    return () => observer.disconnect();
  }, [observeRef]);

  const handleNextUnscored = () => {
    const targetId = nextUnscoredRequiredId || nextUnscoredId;
    if (targetId && onScrollToCriteria) {
      onScrollToCriteria(targetId);
    }
  };

  // Main header (always visible at top of scoring section)
  const MainHeader = (
    <div className="space-y-4 mb-6 p-4 bg-card rounded-lg border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Scoring Progress</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Score each criterion to complete the session
          </p>
        </div>

        <RealTimeScorePreview
          projectedScore={projectedScore}
          isPassing={isPassing}
          passThreshold={passThreshold}
          autoFailTriggered={autoFailTriggered}
          scoredCriteria={scoredCriteria}
          totalCriteria={totalCriteria}
        />
      </div>

      <ScoringProgressBar
        totalCriteria={totalCriteria}
        scoredCriteria={scoredCriteria}
        requiredCriteria={requiredCriteria}
        scoredRequired={scoredRequired}
      />

      {autoFailTriggered && (
        <AutoFailAlert
          autoFailCriteriaIds={autoFailCriteriaIds}
          autoFailCriteriaNames={autoFailCriteriaNames}
          onViewCriteria={onScrollToCriteria}
        />
      )}

      {(nextUnscoredRequiredId || nextUnscoredId) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextUnscored}
          className="w-full gap-2"
        >
          <ChevronDown className="h-4 w-4" />
          {nextUnscoredRequiredId
            ? "Jump to Next Required"
            : "Jump to Next Unscored"}
        </Button>
      )}
    </div>
  );

  // Sticky header (appears when main header scrolls out of view)
  const StickyHeader = (
    <div
      ref={headerRef}
      className={cn(
        "fixed top-16 left-0 right-0 z-40 transition-all duration-300",
        "bg-background/95 backdrop-blur-sm border-b shadow-md",
        isSticky
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="container max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Compact Progress */}
          <ScoringProgressBar
            totalCriteria={totalCriteria}
            scoredCriteria={scoredCriteria}
            requiredCriteria={requiredCriteria}
            scoredRequired={scoredRequired}
            compact
          />

          {/* Auto-fail warning */}
          {autoFailTriggered && (
            <AutoFailAlert
              autoFailCriteriaIds={autoFailCriteriaIds}
              autoFailCriteriaNames={autoFailCriteriaNames}
              compact
            />
          )}

          {/* Compact Score Preview */}
          <RealTimeScorePreview
            projectedScore={projectedScore}
            isPassing={isPassing}
            passThreshold={passThreshold}
            autoFailTriggered={autoFailTriggered}
            scoredCriteria={scoredCriteria}
            totalCriteria={totalCriteria}
            compact
          />

          {/* Next button */}
          {(nextUnscoredRequiredId || nextUnscoredId) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextUnscored}
              className="gap-1 whitespace-nowrap"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {MainHeader}
      {StickyHeader}
    </>
  );
}
