"use client";

import Link from "next/link";
import { BarChart3, Trophy, Phone, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecentSession {
  id: string;
  templateName: string;
  agentName: string;
  score: number;
  date: string;
}

interface ResultsSummaryProps {
  totalCalls: number;
  averageScore: number;
  topPerformer?: { name: string; score: number } | null;
  recentSessions: RecentSession[];
}

export function ResultsSummary({
  totalCalls,
  averageScore,
  topPerformer,
  recentSessions,
}: ResultsSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center h-8 w-8 mx-auto rounded-lg bg-blue-500/10 mb-2">
              <Phone className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">Calls Graded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center h-8 w-8 mx-auto rounded-lg bg-emerald-500/10 mb-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className={cn(
              "text-2xl font-bold",
              averageScore >= 80 ? "text-emerald-600" : averageScore >= 60 ? "text-amber-600" : "text-red-500"
            )}>
              {averageScore > 0 ? `${averageScore}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center h-8 w-8 mx-auto rounded-lg bg-amber-500/10 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            {topPerformer ? (
              <>
                <p className="text-lg font-bold truncate">{topPerformer.name.split(" ")[0]}</p>
                <p className="text-xs text-muted-foreground">{topPerformer.score}% top score</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-muted-foreground">--</p>
                <p className="text-xs text-muted-foreground">Top Performer</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent results */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Recent Results</h3>
            <Link href="/dashboard/sessions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/sessions/${session.id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{session.templateName}</p>
                  <p className="text-xs text-muted-foreground">{session.agentName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant={
                      session.score >= 80 ? "success" : session.score >= 60 ? "warning" : "destructive"
                    }
                  >
                    {session.score}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
