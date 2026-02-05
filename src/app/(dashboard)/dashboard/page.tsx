"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Target,
  Plus,
  Trophy,
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CallCard } from "@/components/calls/call-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Call, DashboardStats } from "@/types";

export default function DashboardPage() {
  const { role, isAdmin, organization, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("week");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, callsRes] = await Promise.all([
          fetch(`/api/dashboard/stats?period=${period}`),
          fetch("/api/calls?pageSize=5"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        }
        if (callsRes.ok) {
          const callsData = await callsRes.json();
          setRecentCalls(callsData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const statCards = [
    {
      title: "Total Calls",
      value: stats?.totalCalls || 0,
      icon: Phone,
      trend: "+12%",
      trendUp: true,
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Analyzed",
      value: stats?.analyzedCalls || 0,
      icon: BarChart3,
      trend: stats?.totalCalls
        ? `${Math.round((stats.analyzedCalls / stats.totalCalls) * 100)}%`
        : "0%",
      trendUp: true,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "Average Score",
      value: stats?.averageScore ? `${stats.averageScore}%` : "N/A",
      icon: Target,
      trend: "+5%",
      trendUp: true,
      gradient: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      title: "Top Score",
      value: stats?.topScore ? `${stats.topScore}%` : "N/A",
      icon: Trophy,
      trend: "Best",
      trendUp: true,
      gradient: "from-purple-500 to-pink-600",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, {profile?.name?.split(" ")[0] || "there"}
            </h1>
            <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
          </div>
          <p className="text-muted-foreground">
            {organization?.name ? `${organization.name} - ` : ""}
            Here&apos;s what&apos;s happening with your sales calls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Select time period"
            className={cn(
              "rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200 hover:border-primary/50"
            )}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          {isAdmin && (
            <Link href="/dashboard/submit">
              <Button variant="gradient" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Call
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            hover
            className={cn(
              "relative overflow-hidden group",
              "animate-fade-in-up"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient background on hover */}
            <div className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5",
              `bg-gradient-to-br ${stat.gradient}`
            )} />

            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={stat.trendUp ? "success" : "destructive"}
                      size="sm"
                      className="gap-1"
                    >
                      {stat.trendUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <Activity className="h-3 w-3" />
                      )}
                      {stat.trend}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      vs last {period}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "rounded-xl p-3 transition-transform duration-200 group-hover:scale-110",
                  stat.iconBg
                )}>
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Recent Calls</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your latest analyzed sales calls
              </p>
            </div>
            <Link href="/dashboard/calls">
              <Button variant="ghost" size="sm" className="gap-2 group">
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentCalls.length > 0 ? (
              <div className="space-y-3">
                {recentCalls.map((call, index) => (
                  <div
                    key={call.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <CallCard call={call} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted/50 p-4 mb-4">
                  <Phone className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg">No calls yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  {isAdmin
                    ? "Upload your first sales call to get AI-powered insights"
                    : "No calls have been assigned to you yet"}
                </p>
                {isAdmin && (
                  <Link href="/dashboard/submit" className="mt-6">
                    <Button variant="gradient" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Your First Call
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Average Score Ring */}
          {stats?.averageScore && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Average Performance</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6">
                <ScoreRing
                  score={stats.averageScore}
                  size="lg"
                  label="avg score"
                />
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  {stats.averageScore >= 80
                    ? "Excellent performance! Keep it up!"
                    : stats.averageScore >= 60
                    ? "Good progress. Room for improvement."
                    : "Focus on improving key areas."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Score Distribution */}
          <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.scoreDistribution && stats.scoreDistribution.length > 0 ? (
                stats.scoreDistribution.map((item, index) => (
                  <div key={item.range} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.range}</span>
                      <Badge variant="secondary" size="sm">
                        {item.count} calls
                      </Badge>
                    </div>
                    <div className="relative">
                      <Progress
                        value={
                          stats.analyzedCalls > 0
                            ? (item.count / stats.analyzedCalls) * 100
                            : 0
                        }
                        className={cn(
                          "h-2",
                          index === 0 && "[&>div]:bg-emerald-500",
                          index === 1 && "[&>div]:bg-blue-500",
                          index === 2 && "[&>div]:bg-amber-500",
                          index === 3 && "[&>div]:bg-red-500"
                        )}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No analyzed calls yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers (Admins only) */}
          {isAdmin && stats?.recentScores && stats.recentScores.length > 0 && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentScores.map((item, index) => (
                    <div
                      key={`${item.callerId}-${index}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                            index === 0
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                              : index === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                              : index === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </div>
                        <span className="font-medium">{item.callerName}</span>
                      </div>
                      <Badge
                        variant={
                          item.score >= 80
                            ? "success"
                            : item.score >= 60
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {item.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Breakdown */}
          {stats?.callsByStatus && Object.keys(stats.callsByStatus).length > 0 && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Call Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.callsByStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          dot
                          pulse={status === "processing"}
                          variant={
                            status === "analyzed"
                              ? "success"
                              : status === "processing"
                              ? "warning"
                              : status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
