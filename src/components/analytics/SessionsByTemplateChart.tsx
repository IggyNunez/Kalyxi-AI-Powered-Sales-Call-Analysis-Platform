"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateData {
  id: string;
  name: string;
  count: number;
  avgScore: number;
}

interface SessionsByTemplateChartProps {
  data: TemplateData[];
  title?: string;
  height?: number;
  className?: string;
}

const COLORS = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#F43F5E", // rose
  "#F97316", // orange
  "#EAB308", // yellow
];

export default function SessionsByTemplateChart({
  data,
  title = "Sessions by Template",
  height = 300,
  className,
}: SessionsByTemplateChartProps) {
  const processedData = useMemo(() => {
    return data
      .slice(0, 8)
      .map((item) => ({
        ...item,
        shortName: item.name.length > 20 ? item.name.slice(0, 17) + "..." : item.name,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const totalSessions = useMemo(() => {
    return processedData.reduce((sum, t) => sum + t.count, 0);
  }, [processedData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-600">Sessions: </span>
              <span className="font-semibold">{data.count}</span>
            </p>
            <p>
              <span className="text-gray-600">Avg Score: </span>
              <span className={cn("font-semibold", getScoreColor(data.avgScore))}>
                {data.avgScore}%
              </span>
            </p>
            <p>
              <span className="text-gray-600">% of Total: </span>
              <span className="font-medium">
                {Math.round((data.count / totalSessions) * 100)}%
              </span>
            </p>
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
            <LayoutTemplate className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No session data available
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
            <LayoutTemplate className="h-5 w-5 text-indigo-600" />
            {title}
          </CardTitle>
          <Badge variant="secondary">{totalSessions} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.1)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Template Stats List */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {processedData.slice(0, 4).map((template, index) => (
            <div
              key={template.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.count} sessions •{" "}
                  <span className={getScoreColor(template.avgScore)}>
                    {template.avgScore}% avg
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
