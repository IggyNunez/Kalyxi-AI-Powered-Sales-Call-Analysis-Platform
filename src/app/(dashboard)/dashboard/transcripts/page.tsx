"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronRight,
  Calendar,
  Mail,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MeetTranscript {
  id: string;
  meeting_code: string;
  conference_record_name: string;
  transcript_name: string;
  transcript_state: string;
  docs_document_id: string | null;
  text_content: string;
  text_source: "docs" | "entries";
  entries_count: number;
  meeting_start_time: string | null;
  meeting_end_time: string | null;
  meeting_space_name: string | null;
  participants: string[];
  created_at: string;
}

interface GoogleConnection {
  id: string;
  google_email: string;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<MeetTranscript[]>([]);
  const [connections, setConnections] = useState<GoogleConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Fetch data
  const fetchData = useCallback(async (reset = false) => {
    if (reset) {
      setOffset(0);
      setLoading(true);
    }

    const currentOffset = reset ? 0 : offset;

    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: currentOffset.toString(),
      });

      if (selectedConnection) {
        params.set("connectionId", selectedConnection);
      }

      const [transcriptsRes, connectionsRes] = await Promise.all([
        fetch(`/api/meet/transcripts?${params.toString()}`),
        connections.length === 0 ? fetch("/api/google/connections") : Promise.resolve(null),
      ]);

      if (transcriptsRes.ok) {
        const data = await transcriptsRes.json();
        if (reset) {
          setTranscripts(data.transcripts || []);
        } else {
          setTranscripts((prev) => [...prev, ...(data.transcripts || [])]);
        }
        setHasMore(data.pagination?.hasMore || false);
      }

      if (connectionsRes && connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [offset, selectedConnection, connections.length]);

  useEffect(() => {
    fetchData(true);
  }, [selectedConnection]);

  const handleLoadMore = () => {
    setOffset((prev) => prev + LIMIT);
    fetchData(false);
  };

  const handleDelete = async (transcriptId: string) => {
    if (!confirm("Are you sure you want to delete this transcript?")) return;

    setDeleting(transcriptId);
    try {
      const response = await fetch("/api/meet/transcripts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });

      if (response.ok) {
        setTranscripts((prev) => prev.filter((t) => t.id !== transcriptId));
      }
    } catch (error) {
      console.error("Failed to delete transcript:", error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Filter transcripts by search
  const filteredTranscripts = transcripts.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.meeting_code.toLowerCase().includes(query) ||
      t.text_content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meet Transcripts</h1>
        <p className="text-muted-foreground mt-1">
          View and manage synced transcripts from Google Meet
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {connections.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedConnection || ""}
              onChange={(e) => setSelectedConnection(e.target.value || null)}
              className="h-10 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All accounts</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.google_email}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTranscripts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No transcripts found</p>
              <p className="text-sm mt-1">
                {transcripts.length === 0
                  ? "Connect a Google account and sync meetings to see transcripts here"
                  : "No transcripts match your search"}
              </p>
              {transcripts.length === 0 && (
                <Link
                  href="/dashboard/settings?tab=connections"
                  className="inline-flex items-center gap-2 mt-4 h-10 px-5 py-2 text-sm font-medium border-2 border-input bg-background shadow-sm rounded-lg hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all"
                >
                  Connect Google Account
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {filteredTranscripts.map((transcript) => (
              <Card
                key={transcript.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <Link href={`/dashboard/transcripts/${transcript.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium font-mono">
                            {transcript.meeting_code}
                          </span>
                          <Badge
                            variant={transcript.text_source === "docs" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {transcript.text_source === "docs" ? "Google Docs" : "Entries"}
                          </Badge>
                          {getDuration(transcript.meeting_start_time, transcript.meeting_end_time) && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {getDuration(transcript.meeting_start_time, transcript.meeting_end_time)}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {transcript.text_content.slice(0, 200)}...
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(transcript.meeting_end_time || transcript.created_at)}
                          </span>
                          <span>
                            {getWordCount(transcript.text_content).toLocaleString()} words
                          </span>
                          {transcript.entries_count > 0 && (
                            <span>{transcript.entries_count} entries</span>
                          )}
                          {transcript.docs_document_id && (
                            <a
                              href={`https://docs.google.com/document/d/${transcript.docs_document_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open in Docs
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(transcript.id);
                          }}
                          disabled={deleting === transcript.id}
                        >
                          {deleting === transcript.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-6">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
