"use client";

import { CheckCircle2, XCircle, Mic, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SessionScoreOverviewCardProps {
  score: number | null;
  passStatus: string | null;
  passThreshold: number;
  talkRatio?: number;
  sentiment?: { overall: string; score: number };
  templateName?: string;
  className?: string;
}

function ScoreRing({
  score,
  size = 100,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return "#10B981";
    if (value >= 60) return "#6366F1";
    if (value >= 40) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(score)}%</span>
      </div>
    </div>
  );
}

export function SessionScoreOverviewCard({
  score,
  passStatus,
  passThreshold,
  talkRatio,
  sentiment,
  templateName,
  className,
}: SessionScoreOverviewCardProps) {
  if (score == null) return null;

  const passed = passStatus === "pass";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <ScoreRing score={score} />

          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Pass/Fail Badge */}
            <div className="flex items-center gap-2">
              {passed ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Passed
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Failed
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                Threshold: {passThreshold}%
              </span>
            </div>

            {/* AI Scored indicator */}
            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
              <Sparkles className="h-3.5 w-3.5" />
              AI Scored
            </div>

            {/* Talk Ratio mini */}
            {talkRatio != null && (
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-gray-400" />
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      talkRatio > 0.7 ? "bg-red-400" : talkRatio > 0.5 ? "bg-amber-400" : "bg-green-400"
                    )}
                    style={{ width: `${Math.round(talkRatio * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{Math.round(talkRatio * 100)}%</span>
              </div>
            )}

            {/* Sentiment */}
            {sentiment && (
              <div className="text-xs text-gray-500">
                Sentiment:{" "}
                <span
                  className={cn(
                    "font-medium",
                    sentiment.overall === "positive" ? "text-green-600" :
                    sentiment.overall === "negative" ? "text-red-600" :
                    "text-gray-600"
                  )}
                >
                  {sentiment.overall}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
