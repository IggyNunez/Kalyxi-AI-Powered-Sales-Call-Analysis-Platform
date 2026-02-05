"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/types";

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "strength":
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "improvement":
        return <TrendingDown className="h-5 w-5 text-yellow-600" />;
      case "objection":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "opportunity":
        return <Target className="h-5 w-5 text-indigo-600" />;
      case "risk":
        return <Zap className="h-5 w-5 text-orange-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-600" />;
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Group insights by type
  const groupedInsights = insights.reduce(
    (acc, insight) => {
      const type = insight.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(insight);
      return acc;
    },
    {} as Record<string, Insight[]>
  );

  const insightTypes = [
    { key: "strength", label: "Strengths", icon: TrendingUp, color: "text-green-600" },
    { key: "improvement", label: "Areas for Improvement", icon: TrendingDown, color: "text-yellow-600" },
    { key: "opportunity", label: "Opportunities", icon: Target, color: "text-indigo-600" },
    { key: "objection", label: "Common Objections", icon: AlertCircle, color: "text-red-600" },
    { key: "risk", label: "Risks", icon: Zap, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-gray-500">
          AI-generated insights from your sales calls
        </p>
      </div>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 font-medium">No insights yet</h3>
            <p className="mt-1 text-center text-sm text-gray-500">
              Upload and analyze sales calls to generate insights
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {insightTypes.map(({ key, label, icon: Icon, color }) => {
            const typeInsights = groupedInsights[key] || [];
            if (typeInsights.length === 0) return null;

            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${color}`}>
                    <Icon className="h-5 w-5" />
                    {label}
                    <Badge variant="secondary" className="ml-2">
                      {typeInsights.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {typeInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className="flex items-start gap-4 rounded-lg border p-4"
                      >
                        <div className="flex-shrink-0">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge variant={getImportanceColor(insight.importance) as "destructive" | "secondary" | "warning"}>
                              {insight.importance}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
