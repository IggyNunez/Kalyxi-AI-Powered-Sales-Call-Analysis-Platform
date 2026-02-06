"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Zap,
  Sparkles,
  Filter,
  SortAsc,
  ChevronRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Insight } from "@/types";

// Insight type configuration - matches API response types
const INSIGHT_CONFIG = {
  recommendation: {
    label: "Recommendations",
    icon: Lightbulb,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    gradient: "from-indigo-500 to-purple-500",
  },
  objection: {
    label: "Customer Objections",
    icon: AlertCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    gradient: "from-amber-500 to-orange-500",
  },
  competitor: {
    label: "Competitor Mentions",
    icon: Target,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    gradient: "from-red-500 to-rose-500",
  },
  gatekeeper: {
    label: "Gatekeeper Calls",
    icon: TrendingDown,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    gradient: "from-slate-500 to-gray-500",
  },
  low_score: {
    label: "Low Scores",
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    gradient: "from-orange-500 to-amber-500",
  },
};

type InsightType = keyof typeof INSIGHT_CONFIG;

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InsightType | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "importance">("importance");

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch("/api/insights");
        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Filter and sort insights
  const filteredInsights = insights
    .filter((insight) => filter === "all" || insight.type === filter)
    .sort((a, b) => {
      if (sortBy === "importance") {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.importance as keyof typeof order] || 2) - (order[b.importance as keyof typeof order] || 2);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  // Group insights by type
  const groupedInsights = filteredInsights.reduce(
    (acc, insight) => {
      const type = insight.type as InsightType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(insight);
      return acc;
    },
    {} as Record<InsightType, Insight[]>
  );

  // Count insights by type
  const insightCounts = Object.entries(INSIGHT_CONFIG).map(([key, config]) => ({
    type: key as InsightType,
    count: insights.filter((i) => i.type === key).length,
    ...config,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            Insights Hub
          </h1>
          <p className="text-gray-500 mt-1">
            AI-generated insights from your sales calls
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sort Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setSortBy("importance")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                sortBy === "importance"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              By Priority
            </button>
            <button
              type="button"
              onClick={() => setSortBy("recent")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                sortBy === "recent"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Recent
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Insights
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
            {insights.length}
          </span>
        </button>
        {insightCounts.map(({ type, count, label, icon: Icon, bgColor, color }) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              filter === type
                ? `${bgColor} ${color} shadow-md ring-2 ring-offset-2 ring-current`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              filter === type ? "bg-white/50" : "bg-gray-200"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {insights.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                <Lightbulb className="h-10 w-10 text-indigo-600" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-pulse" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">No insights yet</h3>
            <p className="mt-2 text-center text-sm text-gray-500 max-w-sm">
              Upload and analyze sales calls to generate AI-powered insights that help improve your team&apos;s performance.
            </p>
            <Link href="/dashboard/submit">
              <Button className="mt-6">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Submit a Call
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredInsights.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 font-semibold text-gray-900">No matching insights</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters to see more insights
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setFilter("all")}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedInsights).map(([type, typeInsights]) => {
            const config = INSIGHT_CONFIG[type as InsightType];
            if (!config || typeInsights.length === 0) return null;
            const Icon = config.icon;

            return (
              <div key={type} className="space-y-4 animate-fade-in-up">
                {/* Section Header */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${config.color}`}>{config.label}</h2>
                    <p className="text-sm text-gray-500">{typeInsights.length} insight{typeInsights.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                {/* Insights Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {typeInsights.map((insight, index) => (
                    <Card
                      key={insight.id}
                      className={`overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 ${config.borderColor} group cursor-pointer`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge
                            variant="outline"
                            className={getImportanceColor(insight.importance)}
                          >
                            {insight.importance} priority
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {insight.description}
                        </p>
                        {insight.created_at && (
                          <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {new Date(insight.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {insights.length > 0 && (
        <Card className="overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Insights Summary
                </h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Overview of AI-generated insights from your calls
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {insightCounts.filter(ic => ic.count > 0).map(({ type, count, label, icon: Icon }) => (
                  <div key={type} className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{count} {label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
