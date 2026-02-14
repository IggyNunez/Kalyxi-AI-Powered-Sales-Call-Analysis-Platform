"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  User,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewSession {
  id: string;
  templateName: string;
  agentName: string;
  score: number | null;
  passStatus: string | null;
  hasCall: boolean;
  completedAt: string | null;
  eventTitle: string | null;
}

export function NeedsReviewCard() {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch(
          "/api/sessions?status=completed&pageSize=5&sortBy=completed_at&sortOrder=desc&include_template=true&include_users=true"
        );
        if (!res.ok) return;
        const { data } = await res.json();
        const mapped = (data || []).map(
          (s: {
            id: string;
            percentage_score?: number | null;
            pass_status?: string | null;
            call_id?: string | null;
            completed_at?: string | null;
            google_event_title?: string | null;
            templates?: { name: string } | null;
            agent?: { name: string } | null;
          }) => ({
            id: s.id,
            templateName: s.templates?.name || "Session",
            agentName: s.agent?.name || "Unknown",
            score: s.percentage_score != null ? Math.round(s.percentage_score) : null,
            passStatus: s.pass_status,
            hasCall: !!s.call_id,
            completedAt: s.completed_at,
            eventTitle: s.google_event_title,
          })
        );
        setSessions(mapped);
      } catch (err) {
        console.error("Error fetching review sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  if (loading || sessions.length === 0) return null;

  return (
    <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            Needs Your Review
          </CardTitle>
          <Link href="/dashboard/sessions?status=completed">
            <Button variant="ghost" size="sm" className="text-indigo-600 gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/sessions/${session.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-white/80 border border-transparent hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-indigo-600 transition-colors">
                    {session.eventTitle || session.templateName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {session.agentName}
                    </span>
                    {session.completedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(session.completedAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {session.hasCall && (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                )}
                {session.score != null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-xs",
                      session.passStatus === "pass"
                        ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                        : session.passStatus === "fail"
                          ? "text-red-600 border-red-300 bg-red-50"
                          : ""
                    )}
                  >
                    {session.score}%
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
