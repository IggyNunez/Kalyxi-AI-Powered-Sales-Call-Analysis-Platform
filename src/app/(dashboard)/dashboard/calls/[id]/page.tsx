"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Calendar,
  Clock,
  Building,
  User,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Target,
  MessageSquare,
  RefreshCw,
  Mail,
  Hash,
  Play,
  Download,
  Share2,
  MoreHorizontal,
  Sparkles,
  ExternalLink,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatDateTime, getScoreColor } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { LinkedSessionsPanel } from "@/components/calls/LinkedSessionsPanel";
import { CreateSessionFromCallButton } from "@/components/calls/CreateSessionFromCallButton";
import type { Call, Analysis } from "@/types";

// Score Ring Component for visual display
function ScoreRing({ score, size = 120, strokeWidth = 10, label }: { score: number; size?: number; strokeWidth?: number; label: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return "#10B981";
    if (value >= 60) return "#6366F1";
    if (value >= 40) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor(score)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{score}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function fetchCall() {
      try {
        const response = await fetch(`/api/calls/${params.id}`);
        if (response.ok) {
          const result = await response.json();
          setCall(result.data);
        } else {
          router.push("/dashboard/calls");
        }
      } catch (error) {
        console.error("Failed to fetch call:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchCall();
    }
  }, [params.id, router]);

  const handleAnalyze = async () => {
    if (!call) return;
    setAnalyzing(true);

    try {
      const response = await fetch(`/api/calls/${call.id}/analyze`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        setCall(result.data);
      }
    } catch (error) {
      console.error("Failed to analyze call:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!call) {
    return null;
  }

  // Get the latest analysis
  const analysis: Analysis | undefined = call.analyses?.[0];
  const results = analysis?.results_json;

  // Extract data from analysis
  const keyTopics = analysis?.key_topics || results?.key_topics || [];
  const objections = analysis?.objections || [];
  const objectionsHandled = results?.objections_handled || [];
  const actionItems = analysis?.action_items || results?.action_items || [];
  const strengths = analysis?.strengths || results?.strengths || [];
  const improvements = analysis?.improvements || results?.areas_for_improvement || [];
  const nextSteps = analysis?.next_steps || results?.next_steps || [];
  const criteriaScores = analysis?.criteria_scores || results?.criteria_scores || {};

  const callTitle = call.title || call.customer_name || call.customer_company || "Call Details";
  const callDate = call.call_timestamp ? new Date(call.call_timestamp) : new Date(call.created_at);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{callTitle}</h1>
                  <Badge
                    variant={
                      call.status === "analyzed"
                        ? "success"
                        : call.status === "failed"
                        ? "destructive"
                        : call.status === "processing"
                        ? "secondary"
                        : "warning"
                    }
                    className="capitalize"
                  >
                    {call.status}
                  </Badge>
                </div>
                {call.caller?.name && (
                  <p className="text-indigo-100 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {call.caller.name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-indigo-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(callDate)}
                  </span>
                  {call.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(call.duration)}
                    </span>
                  )}
                  {call.customer_company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {call.customer_company}
                    </span>
                  )}
                  {call.meet_code && (
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {call.meet_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreateSessionFromCallButton
                callId={call.id}
                callerId={call.caller?.id}
                callerName={call.caller?.name}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 border-0"
              />
              {call.recording_url && (
                <a
                  href={call.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-2">
                    <Play className="h-4 w-4" />
                    Recording
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Download className="h-5 w-5" />
              </Button>
              {isAdmin && (call.status === "pending" || call.status === "failed" || call.status === "analyzed") && (
                <Button
                  variant="secondary"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
                  {call.status === "analyzed" ? "Re-analyze" : "Analyze"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Bar */}
      {(call.customer_email || call.customer_phone || call.external_id || call.customer_name) && (
        <Card className="border-0 bg-gray-50/50">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {call.customer_name && (
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="font-medium">{call.customer_name}</span>
                </div>
              )}
              {call.customer_company && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  {call.customer_company}
                </div>
              )}
              {call.customer_email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  {call.customer_email}
                </div>
              )}
              {call.customer_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {call.customer_phone}
                </div>
              )}
              {call.external_id && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Hash className="h-4 w-4" />
                  ID: {call.external_id}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {call.status === "pending" || call.status === "processing" ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">
              {call.status === "pending" ? "Waiting for Analysis" : "AI Analysis in Progress"}
            </h3>
            <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
              Our AI is analyzing this call to extract insights, score performance, and identify opportunities.
            </p>
          </CardContent>
        </Card>
      ) : call.status === "failed" ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Analysis Failed</h3>
            <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
              There was an error analyzing this call. Please try again or contact support.
            </p>
            {isAdmin && (
              <Button className="mt-6" onClick={handleAnalyze} disabled={analyzing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score Cards with Rings */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-0 divide-x divide-gray-100 md:grid-cols-3">
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50/50 to-transparent">
                  <ScoreRing score={analysis?.overall_score || 0} label="Overall Score" />
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    Based on all criteria
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="flex flex-col items-center">
                    <Badge
                      variant={
                        analysis?.sentiment_label === "positive"
                          ? "success"
                          : analysis?.sentiment_label === "negative"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-lg px-6 py-2 capitalize"
                    >
                      {analysis?.sentiment_label || "Neutral"}
                    </Badge>
                    <span className="mt-4 text-sm font-medium text-gray-600">Sentiment</span>
                    <p className="mt-1 text-xs text-gray-500">
                      Confidence: {analysis?.sentiment_score ? `${analysis.sentiment_score}%` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-bl from-green-50/50 to-transparent">
                  <ScoreRing score={analysis?.deal_probability || 0} label="Deal Probability" />
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    Likelihood to close
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Scores */}
          {Object.keys(criteriaScores).length > 0 && (
            <Card>
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Criteria Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(criteriaScores).map(([criterion, data]) => {
                    const percentage = (data.score / data.max_score) * 100;
                    return (
                      <div
                        key={criterion}
                        className="group rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:border-indigo-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold capitalize text-gray-900">
                            {criterion.replace(/_/g, " ")}
                          </span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                            percentage >= 80 ? "bg-green-100 text-green-700" :
                            percentage >= 60 ? "bg-indigo-100 text-indigo-700" :
                            percentage >= 40 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {data.score}/{data.max_score}
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                              percentage >= 80 ? "bg-green-500" :
                              percentage >= 60 ? "bg-indigo-500" :
                              percentage >= 40 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        {data.feedback && (
                          <p className="mt-3 text-xs text-gray-500 line-clamp-2">{data.feedback}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="w-full justify-start bg-gray-100/80 p-1 rounded-lg">
              <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                Summary
              </TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6">
                Call Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6 animate-fade-in">
              {/* Call Summary */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    Call Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-700 leading-relaxed">{analysis?.summary || "No summary available"}</p>
                </CardContent>
              </Card>

              {/* Strengths & Improvements */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="overflow-hidden border-green-100">
                  <CardHeader className="bg-green-50/50 border-b border-green-100">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-3">
                      {strengths.length > 0 ? (
                        strengths.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-50/50 transition-colors">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No strengths identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-amber-100">
                  <CardHeader className="bg-amber-50/50 border-b border-amber-100">
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <Lightbulb className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-3">
                      {improvements.length > 0 ? (
                        improvements.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-amber-50/50 transition-colors">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No improvements identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Key Topics, Objections, Action Items */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4 text-indigo-600" />
                      Key Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {keyTopics.length > 0 ? (
                        keyTopics.map((topic: string, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          >
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm italic">No topics identified</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      Objections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {objectionsHandled.length > 0 ? (
                        objectionsHandled.map((item, index: number) => (
                          <li key={index} className="rounded-lg bg-gray-50 p-3 text-sm border border-gray-100">
                            <div className="font-medium text-gray-900">{item.objection}</div>
                            <div className="text-gray-600 mt-1.5 text-xs">{item.response}</div>
                            <Badge
                              variant={item.effectiveness >= 80 ? "success" : item.effectiveness >= 50 ? "warning" : "destructive"}
                              className="mt-2"
                            >
                              {item.effectiveness}% effective
                            </Badge>
                          </li>
                        ))
                      ) : objections.length > 0 ? (
                        objections.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-red-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No objections raised</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-indigo-600" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {actionItems.length > 0 ? (
                        actionItems.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-indigo-300 flex-shrink-0 mt-0.5">
                              <CheckCircle className="h-3 w-3 text-indigo-500" />
                            </div>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 text-sm italic">No action items</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Next Steps */}
              {nextSteps.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-indigo-600" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-100" />
                      <ul className="space-y-4">
                        {nextSteps.map((step: string, index: number) => (
                          <li key={index} className="flex items-start gap-4 relative">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white flex-shrink-0 z-10">
                              {index + 1}
                            </span>
                            <span className="pt-1.5 text-gray-700">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insights" className="animate-fade-in">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Talk Ratio */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                      Talk Ratio Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {analysis?.talk_ratio !== undefined ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Sales Rep</span>
                          <span className="font-medium">Customer</span>
                        </div>
                        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-indigo-500 rounded-l-full"
                            style={{ width: `${analysis.talk_ratio}%` }}
                          />
                          <div
                            className="absolute inset-y-0 right-0 bg-emerald-500 rounded-r-full"
                            style={{ width: `${100 - analysis.talk_ratio}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-indigo-600 font-semibold">{analysis.talk_ratio}%</span>
                          <span className="text-emerald-600 font-semibold">{100 - analysis.talk_ratio}%</span>
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${
                          analysis.talk_ratio > 60 ? "bg-amber-50 text-amber-700" :
                          analysis.talk_ratio < 40 ? "bg-green-50 text-green-700" :
                          "bg-blue-50 text-blue-700"
                        }`}>
                          {analysis.talk_ratio > 60
                            ? "Tip: Consider letting the customer speak more to uncover their needs"
                            : analysis.talk_ratio < 40
                            ? "Great job! Customer engagement is high"
                            : "Well-balanced conversation with good engagement"}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">Talk ratio data not available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Key Indicators */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Key Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Decision Maker</div>
                        <div className="flex items-center gap-2">
                          {analysis?.decision_maker_present ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-semibold">
                            {analysis?.decision_maker_present ? "Present" : "Not Present"}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Pricing Discussed</div>
                        <div className="flex items-center gap-2">
                          {analysis?.pricing_discussed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-semibold">
                            {analysis?.pricing_discussed ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Competitor Mentions */}
                {results?.competitor_mentions && results.competitor_mentions.length > 0 && (
                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-5 w-5 text-red-600" />
                        Competitor Mentions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-2">
                        {results.competitor_mentions.map((competitor: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border-red-200"
                          >
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="animate-fade-in">
              <Card className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    Transcript
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {call.source === "google_meet" && call.meet_code && (
                      <Badge variant="secondary" className="gap-1">
                        <Video className="h-3 w-3" />
                        Google Meet
                      </Badge>
                    )}
                    {call.raw_notes && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {call.raw_notes ? (
                    <div className="max-h-[600px] overflow-y-auto whitespace-pre-wrap p-6 text-sm font-mono bg-gray-50/50 leading-relaxed">
                      {call.raw_notes}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-gray-500">No transcript available</p>
                      <p className="text-sm text-gray-400">
                        Transcripts are auto-captured from Google Meet calls
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Linked Coaching Sessions */}
          <LinkedSessionsPanel
            callId={call.id}
            callerId={call.agent_id || call.caller?.id}
            callerName={call.caller?.name}
          />
        </>
      )}

      {/* Show LinkedSessionsPanel even for non-analyzed calls */}
      {(call.status === "pending" || call.status === "processing" || call.status === "failed") && (
        <LinkedSessionsPanel
          callId={call.id}
          callerId={call.caller?.id}
          callerName={call.caller?.name}
        />
      )}
    </div>
  );
}
