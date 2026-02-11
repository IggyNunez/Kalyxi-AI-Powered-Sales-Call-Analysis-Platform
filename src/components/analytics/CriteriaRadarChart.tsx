"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface CriteriaData {
  id: string;
  name: string;
  avgScore: number | null;
  weight?: number;
  assessments?: number;
}

interface CriteriaRadarChartProps {
  data: CriteriaData[];
  title?: string;
  height?: number;
  className?: string;
  showTable?: boolean;
  maxItems?: number;
}

export default function CriteriaRadarChart({
  data,
  title = "Criteria Performance",
  height = 350,
  className,
  showTable = true,
  maxItems = 8,
}: CriteriaRadarChartProps) {
  const processedData = useMemo(() => {
    // Filter out items without scores and limit to maxItems
    const withScores = data
      .filter((d) => d.avgScore !== null && d.avgScore !== undefined)
      .slice(0, maxItems);

    return withScores.map((item) => ({
      ...item,
      // Truncate long names for the radar chart
      shortName: item.name.length > 15 ? item.name.slice(0, 12) + "..." : item.name,
      score: item.avgScore || 0,
    }));
  }, [data, maxItems]);

  const averageScore = useMemo(() => {
    if (processedData.length === 0) return 0;
    return Math.round(
      processedData.reduce((sum, d) => sum + (d.avgScore || 0), 0) / processedData.length
    );
  }, [processedData]);

  const lowestPerforming = useMemo(() => {
    if (processedData.length === 0) return null;
    return processedData.reduce((min, d) =>
      (d.avgScore || 0) < (min.avgScore || 0) ? d : min
    );
  }, [processedData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-100";
    if (score >= 60) return "bg-amber-100";
    return "bg-red-100";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-1">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-600">Score: </span>
              <span className={cn("font-medium", getScoreColor(data.score))}>
                {data.score}%
              </span>
            </p>
            {data.weight !== undefined && (
              <p>
                <span className="text-gray-600">Weight: </span>
                <span className="font-medium">{data.weight}%</span>
              </p>
            )}
            {data.assessments !== undefined && (
              <p>
                <span className="text-gray-600">Assessments: </span>
                <span className="font-medium">{data.assessments}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No criteria scores available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
          <Badge variant="secondary">Avg: {averageScore}%</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Radar Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={processedData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickFormatter={(value) => `${value}%`}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Lowest Performing Alert */}
        {lowestPerforming && (lowestPerforming.avgScore || 0) < 70 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Focus area:</span> {lowestPerforming.name}{" "}
              <span className="text-amber-600">({lowestPerforming.avgScore}%)</span>
            </p>
          </div>
        )}

        {/* Table View */}
        {showTable && (
          <div className="mt-4 space-y-2">
            {processedData
              .sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        getBgColor(item.avgScore || 0)
                      )}
                    />
                    <span className="text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.assessments !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {item.assessments} assessed
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-sm font-semibold w-12 text-right",
                        getScoreColor(item.avgScore || 0)
                      )}
                    >
                      {item.avgScore}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
