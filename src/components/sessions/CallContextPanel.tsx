"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  FileText,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  User,
  Calendar,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Call {
  id: string;
  title: string;
  caller?: { name: string };
  created_at: string;
  duration?: number;
  transcript?: string;
  notes?: string;
  ai_analysis?: {
    summary?: string;
    key_topics?: string[];
    sentiment?: string;
    action_items?: string[];
  };
}

interface CallContextPanelProps {
  callId: string;
  className?: string;
}

export function CallContextPanel({ callId, className }: CallContextPanelProps) {
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("transcript");

  useEffect(() => {
    async function fetchCall() {
      try {
        setError(null);
        const response = await fetch(`/api/calls/${callId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch call");
        }

        const data = await response.json();
        setCall(data.data);
      } catch (err) {
        console.error("Error fetching call:", err);
        setError(err instanceof Error ? err.message : "Failed to load call");
      } finally {
        setLoading(false);
      }
    }

    fetchCall();
  }, [callId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Card className={cn("w-80", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !call) {
    return (
      <Card className={cn("w-80", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Linked Call
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "Call not found"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isCollapsed) {
    return (
      <div className={cn("w-12", className)}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-auto py-4"
        >
          <div className="flex flex-col items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <Phone className="h-4 w-4" />
            <span className="text-[10px] writing-vertical">Call Context</span>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("w-80 flex flex-col", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Call Context
        </CardTitle>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/calls/${callId}`} target="_blank">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Call Info */}
        <div className="space-y-2">
          <p className="font-medium text-sm truncate">{call.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {call.caller && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {call.caller.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(call.created_at).toLocaleDateString()}
            </span>
            {call.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(call.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="transcript"
            className="flex-1 overflow-hidden mt-2"
          >
            <ScrollArea className="h-[300px]">
              {call.transcript ? (
                <div className="text-xs whitespace-pre-wrap pr-4">
                  {call.transcript}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No transcript available
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[300px]">
              {call.ai_analysis ? (
                <div className="space-y-4 pr-4">
                  {call.ai_analysis.summary && (
                    <div>
                      <p className="text-xs font-medium mb-1">Summary</p>
                      <p className="text-xs text-muted-foreground">
                        {call.ai_analysis.summary}
                      </p>
                    </div>
                  )}

                  {call.ai_analysis.key_topics &&
                    call.ai_analysis.key_topics.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Key Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {call.ai_analysis.key_topics.map((topic, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {call.ai_analysis.sentiment && (
                    <div>
                      <p className="text-xs font-medium mb-1">Sentiment</p>
                      <Badge
                        variant={
                          call.ai_analysis.sentiment === "positive"
                            ? "success"
                            : call.ai_analysis.sentiment === "negative"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {call.ai_analysis.sentiment}
                      </Badge>
                    </div>
                  )}

                  {call.ai_analysis.action_items &&
                    call.ai_analysis.action_items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Action Items</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {call.ai_analysis.action_items.map((item, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-primary">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No AI analysis available
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[300px]">
              {call.notes ? (
                <div className="text-xs whitespace-pre-wrap pr-4">
                  {call.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No notes available
                </p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
