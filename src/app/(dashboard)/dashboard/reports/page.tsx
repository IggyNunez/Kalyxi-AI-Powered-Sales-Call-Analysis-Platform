"use client";

import { useState } from "react";
import { FileText, Download, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: "ready" | "generating";
}

export default function ReportsPage() {
  const [reports] = useState<Report[]>([
    {
      id: "1",
      name: "Weekly Performance Summary",
      type: "performance",
      generatedAt: "2024-01-15",
      status: "ready",
    },
    {
      id: "2",
      name: "Monthly Call Analysis",
      type: "analysis",
      generatedAt: "2024-01-01",
      status: "ready",
    },
  ]);

  const handleGenerateReport = (type: string) => {
    alert(`Generating ${type} report...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-500">Generate and download detailed reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Performance Report</CardTitle>
            <CardDescription>
              Overall team performance metrics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport("performance")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Call Analysis Report</CardTitle>
            <CardDescription>
              Detailed analysis of all calls in a period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport("analysis")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Insights Summary</CardTitle>
            <CardDescription>
              AI-generated insights and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleGenerateReport("insights")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Reports</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Date Range
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-gray-500">
                        Generated on {report.generatedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={report.status === "ready" ? "success" : "secondary"}
                    >
                      {report.status}
                    </Badge>
                    <Button variant="outline" size="sm" disabled={report.status !== "ready"}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300" />
              <h3 className="mt-4 font-medium">No reports yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate your first report to see it here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
