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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatDateTime, getScoreColor } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import type { Call, Analysis } from "@/types";

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
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
            >
              {call.status}
            </Badge>
          </div>
          {call.caller?.name && (
            <p className="text-gray-500 flex items-center gap-1">
              <User className="h-4 w-4" />
              {call.caller.name}
              {call.caller.team && <span className="text-gray-400">• {call.caller.team}</span>}
            </p>
          )}
        </div>
        {isAdmin && (call.status === "pending" || call.status === "failed" || call.status === "analyzed") && (
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {call.status === "analyzed" ? "Re-analyze" : "Analyze"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{call.customer_name || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Building className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{call.customer_company || "Unknown"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{formatDateTime(callDate)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">
                {call.duration ? formatDuration(call.duration) : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional customer info */}
      {(call.customer_email || call.customer_phone || call.external_id) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {call.customer_email && (
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="h-4 w-4" />
              {call.customer_email}
            </div>
          )}
          {call.customer_phone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="h-4 w-4" />
              {call.customer_phone}
            </div>
          )}
          {call.external_id && (
            <div className="flex items-center gap-1 text-gray-600">
              <Hash className="h-4 w-4" />
              {call.external_id}
            </div>
          )}
        </div>
      )}

      {call.status === "pending" || call.status === "processing" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <h3 className="mt-4 font-medium">
              {call.status === "pending" ? "Waiting for analysis" : "Analyzing call..."}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This may take a few moments
            </p>
          </CardContent>
        </Card>
      ) : call.status === "failed" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="mt-4 font-medium">Analysis Failed</h3>
            <p className="mt-1 text-sm text-gray-500">
              There was an error analyzing this call
            </p>
            {isAdmin && (
              <Button className="mt-4" onClick={handleAnalyze} disabled={analyzing}>
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score Cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <span className={`text-5xl font-bold ${getScoreColor(analysis?.overall_score || 0)}`}>
                    {analysis?.overall_score || 0}%
                  </span>
                  <Progress value={analysis?.overall_score || 0} className="mt-4" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Badge
                    variant={
                      analysis?.sentiment_label === "positive"
                        ? "success"
                        : analysis?.sentiment_label === "negative"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-lg px-4 py-1"
                  >
                    {analysis?.sentiment_label || "Unknown"}
                  </Badge>
                  <p className="mt-2 text-sm text-gray-500">
                    Score: {analysis?.sentiment_score ? `${analysis.sentiment_score}%` : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Deal Probability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <span className={`text-5xl font-bold ${getScoreColor(analysis?.deal_probability || 0)}`}>
                    {analysis?.deal_probability || 0}%
                  </span>
                  <Progress value={analysis?.deal_probability || 0} className="mt-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Criteria Scores */}
          {Object.keys(criteriaScores).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Criteria Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(criteriaScores).map(([criterion, data]) => (
                    <div key={criterion} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">
                          {criterion.replace(/_/g, " ")}
                        </span>
                        <span className={`text-sm font-bold ${getScoreColor((data.score / data.max_score) * 100)}`}>
                          {data.score}/{data.max_score}
                        </span>
                      </div>
                      <Progress value={(data.score / data.max_score) * 100} className="h-2 mb-2" />
                      <p className="text-xs text-gray-500">{data.feedback}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="notes">Call Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Call Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{analysis?.summary || "No summary available"}</p>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strengths.length > 0 ? (
                        strengths.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <TrendingUp className="mt-1 h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No strengths identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600">
                      <Lightbulb className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {improvements.length > 0 ? (
                        improvements.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <TrendingDown className="mt-1 h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No improvements identified</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {keyTopics.length > 0 ? (
                        keyTopics.map((topic: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500">No topics identified</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Objections Handled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {objectionsHandled.length > 0 ? (
                        objectionsHandled.map((item, index: number) => (
                          <li key={index} className="rounded-lg bg-gray-50 p-2 text-sm">
                            <div className="font-medium">{item.objection}</div>
                            <div className="text-gray-600 mt-1">{item.response}</div>
                            <Badge
                              variant={item.effectiveness >= 80 ? "success" : item.effectiveness >= 50 ? "warning" : "destructive"}
                              className="mt-1"
                            >
                              {item.effectiveness}% effective
                            </Badge>
                          </li>
                        ))
                      ) : objections.length > 0 ? (
                        objections.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="mt-1 h-4 w-4 text-red-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No objections raised</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {actionItems.length > 0 ? (
                        actionItems.map((item: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="mt-1 h-4 w-4 text-indigo-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No action items</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {nextSteps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {nextSteps.map((step: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Talk Ratio */}
                    {analysis?.talk_ratio !== undefined && (
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-5 w-5 text-indigo-600" />
                          <h4 className="font-medium">Talk Ratio</h4>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">Sales Rep</div>
                            <Progress value={analysis.talk_ratio} className="h-3" />
                            <div className="text-right text-sm font-medium">{analysis.talk_ratio}%</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">Customer</div>
                            <Progress value={100 - analysis.talk_ratio} className="h-3" />
                            <div className="text-right text-sm font-medium">{100 - analysis.talk_ratio}%</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {analysis.talk_ratio > 60
                            ? "Consider letting the customer speak more"
                            : analysis.talk_ratio < 40
                            ? "Good balance - customer is engaged"
                            : "Well-balanced conversation"}
                        </p>
                      </div>
                    )}

                    {/* Competitor Mentions */}
                    {results?.competitor_mentions && results.competitor_mentions.length > 0 && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Competitor Mentions</h4>
                        <div className="flex flex-wrap gap-2">
                          {results.competitor_mentions.map((competitor: string, index: number) => (
                            <Badge key={index} variant="outline">
                              {competitor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Decision Maker & Pricing */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Decision Maker Present</h4>
                        <Badge variant={analysis?.decision_maker_present ? "success" : "secondary"}>
                          {analysis?.decision_maker_present ? "Yes" : "No / Unknown"}
                        </Badge>
                      </div>
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Pricing Discussed</h4>
                        <Badge variant={analysis?.pricing_discussed ? "success" : "secondary"}>
                          {analysis?.pricing_discussed ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Call Notes / Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  {call.raw_notes ? (
                    <div className="max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
                      {call.raw_notes}
                    </div>
                  ) : (
                    <p className="text-gray-500">No notes available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
