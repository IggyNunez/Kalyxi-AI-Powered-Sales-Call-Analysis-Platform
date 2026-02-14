"use client";

import {
  MessageSquare,
  CheckCircle,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Target,
  Mic,
  Building,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Objection {
  objection: string;
  response: string;
  effectiveness: number;
}

interface AIAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  objections: Objection[];
  sentiment: { overall: string; score: number };
  talkRatio: number;
  competitorMentions: string[];
}

interface AIInsightsPanelProps {
  analysis: AIAnalysis;
  className?: string;
}

function SentimentBadge({ sentiment }: { sentiment: AIAnalysis["sentiment"] }) {
  const config = {
    positive: { color: "bg-green-100 text-green-700 border-green-200", label: "Positive" },
    neutral: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "Neutral" },
    negative: { color: "bg-red-100 text-red-700 border-red-200", label: "Negative" },
  };
  const c = config[sentiment.overall as keyof typeof config] || config.neutral;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", c.color)}>
      {c.label} ({Math.round(sentiment.score * 100)}%)
    </Badge>
  );
}

function TalkRatioBar({ ratio }: { ratio: number }) {
  const percentage = Math.round(ratio * 100);
  return (
    <div className="flex items-center gap-3">
      <Mic className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Rep Talk Time</span>
          <span>{percentage}%</span>
        </div>
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              percentage > 70 ? "bg-red-400" : percentage > 50 ? "bg-amber-400" : "bg-green-400"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {percentage > 70 ? "Too much talking — listen more" : percentage > 50 ? "Balanced conversation" : "Great listening ratio"}
        </p>
      </div>
    </div>
  );
}

export function AIInsightsPanel({ analysis, className }: AIInsightsPanelProps) {
  const [objectionsExpanded, setObjectionsExpanded] = useState(false);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            Call Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <SentimentBadge sentiment={analysis.sentiment} />
            <div className="flex-1 min-w-[200px]">
              <TalkRatioBar ratio={analysis.talkRatio} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden border-green-100">
          <CardHeader className="bg-green-50/50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-3">
              {analysis.strengths.length > 0 ? (
                analysis.strengths.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-50/50 transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm italic">No strengths identified</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-amber-100">
          <CardHeader className="bg-amber-50/50 border-b border-amber-100">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Lightbulb className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-3">
              {analysis.improvements.length > 0 ? (
                analysis.improvements.map((item, index) => (
                  <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-amber-50/50 transition-colors">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm italic">No improvements identified</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {analysis.actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-indigo-300 flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-indigo-500">{index + 1}</span>
                  </div>
                  <span className="text-gray-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Objection Handling */}
      {analysis.objections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button
              onClick={() => setObjectionsExpanded(!objectionsExpanded)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Objection Handling ({analysis.objections.length})
              </CardTitle>
              {objectionsExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </CardHeader>
          {objectionsExpanded && (
            <CardContent>
              <ul className="space-y-3">
                {analysis.objections.map((item, index) => (
                  <li key={index} className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                    <div className="font-medium text-gray-900 text-sm">{item.objection}</div>
                    <div className="text-gray-600 mt-2 text-sm">{item.response}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Progress
                        value={item.effectiveness}
                        className={cn(
                          "h-2 flex-1",
                          item.effectiveness >= 80 ? "[&>div]:bg-green-500" :
                          item.effectiveness >= 50 ? "[&>div]:bg-amber-500" :
                          "[&>div]:bg-red-500"
                        )}
                      />
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        item.effectiveness >= 80 ? "bg-green-100 text-green-700" :
                        item.effectiveness >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {item.effectiveness}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Competitor Mentions */}
      {analysis.competitorMentions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-600" />
              Competitor Mentions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.competitorMentions.map((mention, index) => (
                <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-700">
                  {mention}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
