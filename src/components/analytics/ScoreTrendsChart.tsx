"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  avgScore: number;
  sessions?: number;
  count?: number;
}

interface ScoreTrendsChartProps {
  data: DataPoint[];
  title?: string;
  showSessions?: boolean;
  height?: number;
  className?: string;
}

export default function ScoreTrendsChart({
  data,
  title = "Score Trend",
  showSessions = true,
  height = 300,
  className,
}: ScoreTrendsChartProps) {
  const processedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      formattedDate: format(parseISO(point.date), "MMM d"),
      sessions: point.sessions ?? point.count ?? 0,
    }));
  }, [data]);

  const trend = useMemo(() => {
    if (processedData.length < 2) return { value: 0, direction: "neutral" };

    const firstHalf = processedData.slice(0, Math.floor(processedData.length / 2));
    const secondHalf = processedData.slice(Math.floor(processedData.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, p) => sum + p.avgScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, p) => sum + p.avgScore, 0) / secondHalf.length;

    const diff = Math.round(secondAvg - firstAvg);

    return {
      value: Math.abs(diff),
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    };
  }, [processedData]);

  const averageScore = useMemo(() => {
    if (processedData.length === 0) return 0;
    return Math.round(
      processedData.reduce((sum, p) => sum + p.avgScore, 0) / processedData.length
    );
  }, [processedData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">
                {entry.name === "Avg Score" ? `${entry.value}%` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-3">
            {/* Average Badge */}
            <Badge variant="secondary" className="gap-1">
              Avg: {averageScore}%
            </Badge>

            {/* Trend Badge */}
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                trend.direction === "up" && "text-emerald-600 border-emerald-200",
                trend.direction === "down" && "text-red-600 border-red-200"
              )}
            >
              {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
              {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
              {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
              {trend.value}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              {showSessions && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              {showSessions && (
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="avgScore"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#colorScore)"
                name="Avg Score"
                dot={{ fill: "#6366F1", strokeWidth: 0, r: 3 }}
                activeDot={{ fill: "#6366F1", strokeWidth: 0, r: 5 }}
              />
              {showSessions && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Sessions"
                  dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: "#10B981", strokeWidth: 0, r: 5 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
