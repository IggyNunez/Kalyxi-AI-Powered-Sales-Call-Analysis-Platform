"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Phone,
  Target,
  Users,
  BarChart3,
  Download,
  ClipboardCheck,
  Award,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaderboard, ScoreTrendsChart, SessionsByTemplateChart } from "@/components/analytics";

interface CallAnalyticsData {
  scoreDistribution: { range: string; count: number }[];
  weeklyTrend: { week: string; calls: number; avgScore: number }[];
  sentimentBreakdown: { name: string; value: number }[];
  topObjections: { objection: string; count: number }[];
  topTopics: { topic: string; count: number }[];
}

interface SessionAnalyticsData {
  summary: {
    totalSessions: number;
    completedSessions: number;
    pendingSessions: number;
    averageScore: number;
    passRate: number;
  };
  scoreDistribution: { range: string; count: number }[];
  sessionsByTemplate: { id: string; name: string; count: number; avgScore: number }[];
  weeklyTrend: { week: string; sessions: number; completed: number; avgScore: number }[];
  sessionsOverTime: { date: string; count: number; avgScore: number }[];
  statusBreakdown: { status: string; count: number }[];
  topCoaches: { id: string; name: string; sessions: number; avgScore: number }[];
  templatesCount: number;
  agentsCount: number;
}

const COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EF4444", "#8B5CF6"];

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  gradient: string;
}) {
  const isPositive = change !== undefined && change >= 0;
  return (
    <div className={`rounded-xl shadow-sm bg-gradient-to-br ${gradient}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-white/80" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-white/80" />
                )}
                <span className="text-sm text-white/80">
                  {isPositive ? "+" : ""}{change}% {changeLabel}
                </span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [callData, setCallData] = useState<CallAnalyticsData | null>(null);
  const [sessionData, setSessionData] = useState<SessionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [activeView, setActiveView] = useState<"sessions" | "calls">("sessions");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        // Fetch both call and session analytics
        const [callsResponse, sessionsResponse] = await Promise.all([
          fetch(`/api/analytics?period=${timeRange}`),
          fetch(`/api/analytics/dashboard?period=${timeRange}`),
        ]);

        if (callsResponse.ok) {
          const result = await callsResponse.json();
          setCallData(result);
        }

        if (sessionsResponse.ok) {
          const result = await sessionsResponse.json();
          setSessionData(result);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Performance insights and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "90d", label: "90D" },
              { value: "1y", label: "1Y" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as typeof timeRange)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeRange === option.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4 flex-shrink-0" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs: Sessions vs Calls */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList className="bg-gray-100/80 p-1 rounded-lg">
          <TabsTrigger
            value="sessions"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Coaching Sessions
          </TabsTrigger>
          <TabsTrigger
            value="calls"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 gap-2"
          >
            <Phone className="h-4 w-4" />
            Call Analysis
          </TabsTrigger>
        </TabsList>

        {/* Sessions Analytics */}
        <TabsContent value="sessions" className="space-y-6 animate-fade-in mt-6">
          {sessionData ? (
            <>
              {/* Session Stat Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Sessions"
                  value={sessionData.summary.totalSessions}
                  icon={ClipboardCheck}
                  gradient="from-indigo-600 to-violet-600"
                />
                <StatCard
                  title="Average Score"
                  value={`${sessionData.summary.averageScore}%`}
                  icon={Target}
                  gradient="from-emerald-600 to-teal-600"
                />
                <StatCard
                  title="Pass Rate"
                  value={`${sessionData.summary.passRate}%`}
                  icon={Award}
                  gradient="from-amber-500 to-orange-600"
                />
                <StatCard
                  title="Active Agents"
                  value={sessionData.agentsCount}
                  icon={Users}
                  gradient="from-pink-600 to-rose-600"
                />
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Score Trend */}
                <ScoreTrendsChart
                  data={sessionData.sessionsOverTime}
                  title="Score Trend Over Time"
                  showSessions={true}
                />

                {/* Sessions by Template */}
                <SessionsByTemplateChart
                  data={sessionData.sessionsByTemplate}
                  title="Sessions by Template"
                />
              </div>

              {/* Score Distribution & Leaderboard */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Score Distribution */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Score Distribution
                      </CardTitle>
                      <Badge variant="secondary">All sessions</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessionData.scoreDistribution}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={1} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #E5E7EB",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                          />
                          <Bar dataKey="count" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Trend */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                        Weekly Progress
                      </CardTitle>
                      <Badge variant="secondary">Last 4 weeks</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sessionData.weeklyTrend}>
                          <defs>
                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #E5E7EB",
                              borderRadius: "8px",
                            }}
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="sessions"
                            stroke="#6366F1"
                            strokeWidth={2}
                            fill="url(#colorSessions)"
                            name="Sessions"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="avgScore"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                            name="Avg Score"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leaderboard Section */}
              <Leaderboard period={timeRange} limit={10} />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No session data available</p>
                <p className="text-sm mt-1">Start scoring sessions to see analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calls Analytics (existing) */}
        <TabsContent value="calls" className="space-y-6 animate-fade-in mt-6">
          {callData ? (
            <>
              {/* Call Stat Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Calls"
                  value={callData.weeklyTrend.reduce((sum, w) => sum + w.calls, 0)}
                  icon={Phone}
                  gradient="from-indigo-600 to-violet-600"
                />
                <StatCard
                  title="Average Score"
                  value={`${Math.round(callData.weeklyTrend.reduce((sum, w) => sum + w.avgScore, 0) / callData.weeklyTrend.length)}%`}
                  icon={Target}
                  gradient="from-emerald-600 to-teal-600"
                />
                <StatCard
                  title="Positive Sentiment"
                  value={`${callData.sentimentBreakdown[0]?.value || 0}%`}
                  icon={TrendingUp}
                  gradient="from-amber-500 to-orange-600"
                />
                <StatCard
                  title="Team Members"
                  value="8"
                  icon={Users}
                  gradient="from-pink-600 to-rose-600"
                />
              </div>

              {/* Call Charts */}
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-gray-100/80 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="topics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                    Topics & Objections
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-fade-in">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Weekly Call Trend */}
                    <Card className="overflow-hidden">
                      <CardHeader className="border-b bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                            Weekly Call Trend
                          </CardTitle>
                          <Badge variant="secondary">Last 4 weeks</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={callData.weeklyTrend}>
                              <defs>
                                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #E5E7EB",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                }}
                              />
                              <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="calls"
                                stroke="#6366F1"
                                strokeWidth={2}
                                fill="url(#colorCalls)"
                                name="Calls"
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="avgScore"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                                name="Avg Score"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sentiment Breakdown */}
                    <Card className="overflow-hidden">
                      <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-indigo-600" />
                          Sentiment Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="h-80 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={callData.sentimentBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {callData.sentimentBreakdown.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="none"
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #E5E7EB",
                                  borderRadius: "8px",
                                }}
                                formatter={(value) => [`${value}%`, "Percentage"]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                          {callData.sentimentBreakdown.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm text-gray-600">{item.name}</span>
                              <span className="text-sm font-semibold">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6 animate-fade-in">
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-indigo-600" />
                          Score Distribution
                        </CardTitle>
                        <Badge variant="secondary">All calls</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={callData.scoreDistribution}>
                            <defs>
                              <linearGradient id="colorBarCalls" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={1} />
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.8} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #E5E7EB",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar dataKey="count" fill="url(#colorBarCalls)" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="topics" className="space-y-6 animate-fade-in">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Top Topics */}
                    <Card className="overflow-hidden">
                      <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-indigo-600" />
                          Top Discussion Topics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {callData.topTopics.map((topic) => {
                            const maxCount = Math.max(...callData.topTopics.map((t) => t.count));
                            const percentage = (topic.count / maxCount) * 100;
                            return (
                              <div key={topic.topic} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-700">{topic.topic}</span>
                                  <span className="text-gray-500">{topic.count} mentions</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Common Objections */}
                    <Card className="overflow-hidden">
                      <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-red-600" />
                          Common Objections
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {callData.topObjections.map((obj) => {
                            const maxCount = Math.max(...callData.topObjections.map((o) => o.count));
                            const percentage = (obj.count / maxCount) * 100;
                            return (
                              <div key={obj.objection} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-700">{obj.objection}</span>
                                  <span className="text-gray-500">{obj.count} times</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No call data available</p>
                <p className="text-sm mt-1">Analyze calls to see analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
