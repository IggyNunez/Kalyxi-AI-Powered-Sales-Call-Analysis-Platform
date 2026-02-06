import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { AnalysisResults } from "@/types/database";

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  callId: string;
  callTimestamp: string;
  customerName?: string;
  customerCompany?: string;
}

export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Optional filters
    const type = searchParams.get("type");
    const importance = searchParams.get("importance");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Build query for calls with analyses
    let query = supabase
      .from("calls")
      .select(`
        id,
        customer_name,
        customer_company,
        call_timestamp,
        caller_id,
        analyses (
          id,
          grading_results_json
        )
      `)
      .eq("org_id", orgId!)
      .eq("status", "analyzed")
      .order("call_timestamp", { ascending: false });

    // For callers, only show their own calls
    if (role === "caller") {
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (callerData) {
        query = query.eq("caller_id", callerData.id);
      } else {
        return NextResponse.json({ insights: [] });
      }
    }

    const { data: calls, error: callsError } = await query.limit(limit);

    if (callsError) {
      console.error("Error fetching calls for insights:", callsError);
      return errorResponse("Failed to fetch insights", 500);
    }

    // Extract insights from analysis results
    const insights: Insight[] = [];
    let insightCounter = 0;

    calls?.forEach((call) => {
      const analyses = call.analyses as Array<{
        id: string;
        grading_results_json: AnalysisResults;
      }> | null;

      if (!analyses || analyses.length === 0) return;

      const analysis = analyses[0];
      const results = analysis.grading_results_json;

      // Extract recommendations as insights
      const recommendations = results?.recommendations || [];
      recommendations.forEach((rec: string, index: number) => {
        const insight: Insight = {
          id: `${call.id}-rec-${index}`,
          type: "recommendation",
          title: "Recommendation",
          description: rec,
          importance: index === 0 ? "high" : "medium",
          callId: call.id,
          callTimestamp: call.call_timestamp,
          customerName: call.customer_name || undefined,
          customerCompany: call.customer_company || undefined,
        };

        if (matchesFilters(insight, type, importance)) {
          insights.push(insight);
          insightCounter++;
        }
      });

      // Extract objections as insights
      const objections = results?.objections || [];
      objections.forEach((obj: { objection: string; response?: string }, index: number) => {
        const insight: Insight = {
          id: `${call.id}-obj-${index}`,
          type: "objection",
          title: "Customer Objection",
          description: obj.objection + (obj.response ? ` (Response: ${obj.response})` : ""),
          importance: "medium",
          callId: call.id,
          callTimestamp: call.call_timestamp,
          customerName: call.customer_name || undefined,
          customerCompany: call.customer_company || undefined,
        };

        if (matchesFilters(insight, type, importance)) {
          insights.push(insight);
          insightCounter++;
        }
      });

      // Extract competitor mentions as insights
      const competitors = results?.competitorMentions || [];
      competitors.forEach((comp: string, index: number) => {
        const insight: Insight = {
          id: `${call.id}-comp-${index}`,
          type: "competitor",
          title: "Competitor Mentioned",
          description: `Customer mentioned competitor: ${comp}`,
          importance: "high",
          callId: call.id,
          callTimestamp: call.call_timestamp,
          customerName: call.customer_name || undefined,
          customerCompany: call.customer_company || undefined,
        };

        if (matchesFilters(insight, type, importance)) {
          insights.push(insight);
          insightCounter++;
        }
      });

      // Extract gatekeeper detection as insight
      if (results?.gatekeeperDetected) {
        const insight: Insight = {
          id: `${call.id}-gk`,
          type: "gatekeeper",
          title: "Gatekeeper Detected",
          description: "Call was handled by a gatekeeper before reaching decision maker",
          importance: "low",
          callId: call.id,
          callTimestamp: call.call_timestamp,
          customerName: call.customer_name || undefined,
          customerCompany: call.customer_company || undefined,
        };

        if (matchesFilters(insight, type, importance)) {
          insights.push(insight);
          insightCounter++;
        }
      }

      // Extract low scores as insights
      const overallScore = results?.overallScore;
      if (overallScore !== undefined && overallScore < 60) {
        const insight: Insight = {
          id: `${call.id}-lowscore`,
          type: "low_score",
          title: "Low Performance Score",
          description: `Call scored ${overallScore}/100 - review recommended`,
          importance: "high",
          callId: call.id,
          callTimestamp: call.call_timestamp,
          customerName: call.customer_name || undefined,
          customerCompany: call.customer_company || undefined,
        };

        if (matchesFilters(insight, type, importance)) {
          insights.push(insight);
          insightCounter++;
        }
      }
    });

    // Sort by importance (high > medium > low) then by call timestamp
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => {
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      if (impDiff !== 0) return impDiff;
      return new Date(b.callTimestamp).getTime() - new Date(a.callTimestamp).getTime();
    });

    // Return limited results
    return NextResponse.json({ insights: insights.slice(0, limit) });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return errorResponse("Failed to fetch insights", 500);
  }
}

function matchesFilters(
  insight: Insight,
  type: string | null,
  importance: string | null
): boolean {
  if (type && insight.type !== type) return false;
  if (importance && insight.importance !== importance) return false;
  return true;
}
