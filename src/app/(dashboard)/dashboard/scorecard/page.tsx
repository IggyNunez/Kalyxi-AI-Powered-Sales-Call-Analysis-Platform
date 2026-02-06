"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Settings,
  Star,
  Target,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  Info,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Scorecard, ScorecardCriterion } from "@/types/database";

// Score ring component
function ScoreRing({
  score,
  maxScore = 100,
  size = "lg",
  label,
}: {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const getColor = () => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-1000 ease-out", getColor())}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", textSizes[size], getColor())}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// Criterion card component
function CriterionCard({
  criterion,
  index,
}: {
  criterion: ScorecardCriterion;
  index: number;
}) {
  const getWeightColor = (weight: number) => {
    if (weight >= 25) return "bg-primary/20 text-primary border-primary/30";
    if (weight >= 15) return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    return "bg-muted text-muted-foreground border-muted";
  };

  return (
    <div
      className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all duration-200 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
              {index + 1}
            </div>
            <h4 className="font-semibold">{criterion.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>

          {/* Scoring Guide */}
          {criterion.scoring_guide && (
            <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">Scoring Guide</p>
              <p className="text-sm">{criterion.scoring_guide}</p>
            </div>
          )}

          {/* Keywords */}
          {criterion.keywords && criterion.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {criterion.keywords.map((keyword, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("font-mono", getWeightColor(criterion.weight))}>
            {criterion.weight}%
          </Badge>
          <div className="text-xs text-muted-foreground text-right">
            Max: {criterion.max_score} pts
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScorecardPage() {
  const { isAdmin } = useAuth();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScorecard = async () => {
      try {
        const response = await fetch("/api/scorecards/active");
        if (response.ok) {
          const data = await response.json();
          setScorecard(data.data);
        } else if (response.status === 404) {
          setError("No active scorecard found. Create one in Settings.");
        } else {
          setError("Failed to load scorecard");
        }
      } catch (err) {
        console.error("Error fetching scorecard:", err);
        setError("Failed to load scorecard");
      } finally {
        setLoading(false);
      }
    };

    fetchScorecard();
  }, []);

  const criteria = (scorecard?.criteria as ScorecardCriterion[]) || [];
  const totalMaxScore = criteria.reduce((sum, c) => sum + c.max_score, 0);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Active Scorecard
          </h1>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Active Scorecard</h3>
            <p className="text-muted-foreground mb-6">
              {error || "Create and activate a scorecard to start grading calls"}
            </p>
            {isAdmin && (
              <Link href="/dashboard/scorecard/builder">
                <Button variant="gradient" className="gap-2">
                  <Target className="h-4 w-4" />
                  Create Scorecard
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Active Scorecard
          </h1>
          <p className="text-muted-foreground mt-1">
            Current grading criteria for evaluating sales calls
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/scorecard/builder">
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              Edit Scorecards
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Criteria List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Scorecard Info */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-indigo-500/10 to-purple-500/10 p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">{scorecard.name}</h2>
                    <Badge variant="gradient" className="gap-1">
                      <Star className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {scorecard.description || "No description provided"}
                  </p>
                </div>
                <Badge variant="secondary">v{scorecard.version}</Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-muted/30">
                  <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{criteria.length}</p>
                  <p className="text-xs text-muted-foreground">Criteria</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <Award className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold">{totalMaxScore}</p>
                  <p className="text-xs text-muted-foreground">Max Points</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-muted-foreground">Total Weight</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Cards */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Grading Criteria
            </h3>
            {criteria
              .sort((a, b) => a.order - b.order)
              .map((criterion, index) => (
                <CriterionCard key={criterion.id} criterion={criterion} index={index} />
              ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Weight Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Weight Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criteria
                .sort((a, b) => b.weight - a.weight)
                .map((criterion, index) => (
                  <div key={criterion.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{criterion.name}</span>
                      <span className="text-muted-foreground">{criterion.weight}%</span>
                    </div>
                    <Progress value={criterion.weight} className="h-2" />
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="bg-gradient-to-br from-primary/5 to-indigo-500/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                How Scoring Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">1. AI Analysis</strong> — When a call is submitted,
                our AI analyzes it against each criterion.
              </p>
              <p>
                <strong className="text-foreground">2. Criterion Scoring</strong> — Each criterion is
                scored from 0 to its max score based on the scoring guide.
              </p>
              <p>
                <strong className="text-foreground">3. Weighted Total</strong> — Scores are weighted
                by importance and combined for the final score.
              </p>
              <p>
                <strong className="text-foreground">4. Feedback</strong> — Detailed feedback is
                provided for each criterion to help improve.
              </p>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Tips for High Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Focus on high-weight criteria first</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Use keywords naturally in conversations</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Follow the scoring guide for each criterion</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Review feedback from previous calls</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
