"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Medal,
  Minus,
  ChevronDown,
  Users,
  Target,
  Award,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  sessions: number;
  avgScore: number;
  passRate: number;
  trend: number;
  bestScore: number;
  lowestScore: number;
}

interface TopImprover {
  rank: number;
  id: string;
  name: string;
  trend: number;
  avgScore: number;
}

interface ConsistentPerformer {
  rank: number;
  id: string;
  name: string;
  stdDev: number;
  avgScore: number;
}

interface LeaderboardData {
  period: string;
  sortBy: string;
  leaderboard: LeaderboardEntry[];
  topImprovers: TopImprover[];
  mostConsistent: ConsistentPerformer[];
  orgStats: {
    totalSessions: number;
    totalAgents: number;
    avgScore: number;
    passRate: number;
  };
}

interface LeaderboardProps {
  period?: string;
  limit?: number;
  className?: string;
}

export default function Leaderboard({
  period = "30d",
  limit = 10,
  className,
}: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("avgScore");

  useEffect(() => {
    fetchLeaderboard();
  }, [period, sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/leaderboard?period=${period}&sort=${sortBy}&limit=${limit}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    } else if (trend < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Failed to load leaderboard
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avgScore">Avg Score</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
                <SelectItem value="passRate">Pass Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.leaderboard.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sessions completed yet</p>
              </div>
            ) : (
              data.leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50",
                    entry.rank <= 3 && "bg-gradient-to-r from-yellow-50/50 to-transparent"
                  )}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.avatarUrl || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                        {getInitials(entry.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-center">
                      <p className={cn("text-lg font-bold", getScoreColor(entry.avgScore))}>
                        {entry.avgScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{entry.sessions}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{entry.passRate}%</p>
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-1">
                    {getTrendIcon(entry.trend)}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        entry.trend > 0 && "text-emerald-600",
                        entry.trend < 0 && "text-red-600",
                        entry.trend === 0 && "text-muted-foreground"
                      )}
                    >
                      {entry.trend > 0 ? "+" : ""}{entry.trend}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Side Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Improvers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Most Improved
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topImprovers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not enough data yet
              </p>
            ) : (
              data.topImprovers.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {entry.rank}
                    </Badge>
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+{entry.trend}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Most Consistent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500" />
              Most Consistent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.mostConsistent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not enough data yet
              </p>
            ) : (
              data.mostConsistent.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {entry.rank}
                    </Badge>
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", getScoreColor(entry.avgScore))}>
                      {entry.avgScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ±{entry.stdDev}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Org Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.orgStats.totalAgents}</p>
              <p className="text-xs text-muted-foreground">Active Agents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.orgStats.totalSessions}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", getScoreColor(data.orgStats.avgScore))}>
                {data.orgStats.avgScore}%
              </p>
              <p className="text-xs text-muted-foreground">Org Avg Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.orgStats.passRate}%</p>
              <p className="text-xs text-muted-foreground">Org Pass Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
