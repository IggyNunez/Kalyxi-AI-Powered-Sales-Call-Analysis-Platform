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
  Lightbulb,
  CheckCircle2,
  Circle,
  Upload,
  Users,
  Settings,
  Zap,
  Clock,
  Calendar,
  ChevronRight,
  Flame,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CallCard } from "@/components/calls/call-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Call, DashboardStats } from "@/types";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  completed: boolean;
}

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

  const getTimeEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "sunrise";
    if (hour < 18) return "sun";
    return "moon";
  };

  // Onboarding steps for new users
  const onboardingSteps: OnboardingStep[] = isAdmin
    ? [
        {
          id: "profile",
          title: "Complete your profile",
          description: "Add your name and details",
          icon: Users,
          href: "/dashboard/settings",
          completed: Boolean(profile?.name),
        },
        {
          id: "first-call",
          title: "Upload your first call",
          description: "Get AI-powered insights",
          icon: Upload,
          href: "/dashboard/submit",
          completed: (stats?.totalCalls || 0) > 0,
        },
        {
          id: "grading",
          title: "Set up grading criteria",
          description: "Customize how calls are scored",
          icon: Target,
          href: "/dashboard/grading",
          completed: false, // Would check from API
        },
        {
          id: "team",
          title: "Invite your team",
          description: "Add callers to your organization",
          icon: Users,
          href: "/dashboard/callers",
          completed: false, // Would check from API
        },
      ]
    : [];

  const completedSteps = onboardingSteps.filter((s) => s.completed).length;
  const showOnboarding = isAdmin && completedSteps < onboardingSteps.length;

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

  // AI insights based on stats
  const getAiInsights = () => {
    const insights = [];

    if (stats?.averageScore) {
      if (stats.averageScore >= 80) {
        insights.push({
          type: "success",
          title: "Strong Performance",
          message: "Your team is performing above average. Keep up the momentum!",
          icon: Flame,
        });
      } else if (stats.averageScore >= 60) {
        insights.push({
          type: "info",
          title: "Room for Growth",
          message: "Focus on objection handling to boost scores by 10-15%.",
          icon: TrendingUp,
        });
      } else {
        insights.push({
          type: "warning",
          title: "Needs Attention",
          message: "Consider scheduling coaching sessions to improve call quality.",
          icon: Lightbulb,
        });
      }
    }

    if (stats?.totalCalls && stats.analyzedCalls < stats.totalCalls) {
      insights.push({
        type: "info",
        title: "Pending Analysis",
        message: `${stats.totalCalls - stats.analyzedCalls} calls waiting to be analyzed.`,
        icon: Clock,
      });
    }

    return insights;
  };

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

  const aiInsights = getAiInsights();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, {profile?.name?.split(" ")[0] || "there"}
            </h1>
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">AI Ready</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            {organization?.name && (
              <span className="font-medium text-foreground">{organization.name}</span>
            )}
            {organization?.name && " - "}
            Here&apos;s your sales performance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Select time period"
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          {isAdmin && (
            <Link href="/dashboard/submit">
              <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Add Call</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Onboarding Banner (for new users) */}
      {showOnboarding && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-indigo-500/5 animate-fade-in-up">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Get Started with Kalyxi</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Complete these steps to unlock the full power of AI-powered call analysis.
                </p>
                <div className="flex items-center gap-3">
                  <Progress
                    value={(completedSteps / onboardingSteps.length) * 100}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {completedSteps}/{onboardingSteps.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {onboardingSteps.map((step) => (
                  <Link
                    key={step.id}
                    href={step.href}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                      step.completed
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-background hover:bg-primary/5 hover:border-primary/30 border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        step.completed
                          ? "bg-emerald-500/20 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium text-center",
                        step.completed ? "text-emerald-600" : "text-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            hover
            className={cn("relative overflow-hidden group", "animate-fade-in-up")}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient background on hover */}
            <div
              className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5",
                `bg-gradient-to-br ${stat.gradient}`
              )}
            />

            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
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
                    <span className="text-xs text-muted-foreground">vs last {period}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-3 transition-transform duration-200 group-hover:scale-110",
                    stat.iconBg
                  )}
                >
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights Section */}
      {aiInsights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          {aiInsights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border",
                insight.type === "success" && "bg-emerald-500/5 border-emerald-500/20",
                insight.type === "warning" && "bg-amber-500/5 border-amber-500/20",
                insight.type === "info" && "bg-blue-500/5 border-blue-500/20"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                  insight.type === "success" && "bg-emerald-500/10 text-emerald-600",
                  insight.type === "warning" && "bg-amber-500/10 text-amber-600",
                  insight.type === "info" && "bg-blue-500/10 text-blue-600"
                )}
              >
                <insight.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">AI Insight</span>
                </div>
                <p className="font-semibold mt-0.5">{insight.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Calls */}
        <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Recent Calls</CardTitle>
              <p className="text-sm text-muted-foreground">Your latest analyzed sales calls</p>
            </div>
            <Link href="/dashboard/calls">
              <Button variant="ghost" size="sm" className="gap-2 group">
                <span>View all</span>
                <ArrowRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1" />
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
                <div className="rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 p-6 mb-4">
                  <Phone className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">No calls yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  {isAdmin
                    ? "Upload your first sales call to get AI-powered insights and coaching recommendations"
                    : "No calls have been assigned to you yet. Check back later!"}
                </p>
                {isAdmin && (
                  <Link href="/dashboard/submit" className="mt-6">
                    <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
                      <Upload className="h-4 w-4 flex-shrink-0" />
                      <span>Add Your First Call</span>
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
          {stats?.averageScore != null && stats.averageScore > 0 && (
            <Card className="animate-fade-in-up overflow-hidden" style={{ animationDelay: "300ms" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-lg flex items-center gap-2">
                  Average Performance
                  {stats.averageScore >= 80 && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6 relative">
                <ScoreRing score={stats.averageScore} size="lg" label="avg score" />
                <p className="mt-4 text-sm text-muted-foreground text-center max-w-[200px]">
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
                        value={stats.analyzedCalls > 0 ? (item.count / stats.analyzedCalls) * 100 : 0}
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
                          item.score >= 80 ? "success" : item.score >= 60 ? "warning" : "destructive"
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

          {/* Quick Actions */}
          {isAdmin && (
            <Card className="animate-fade-in-up" style={{ animationDelay: "700ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/submit">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">Upload Call</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <span className="font-medium">View Analytics</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/dashboard/insights">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                      </div>
                      <span className="font-medium">AI Insights</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/dashboard/sessions/new">
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-purple-500" />
                      </div>
                      <span className="font-medium">New Session</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
