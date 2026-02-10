"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  Loader2,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Calendar,
  Copy,
  Check,
  Plus,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [transcript, setTranscript] = useState<MeetTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const response = await fetch(`/api/meet/transcripts/${id}`);
        const data = await response.json();

        if (response.ok) {
          setTranscript(data.transcript);
        } else {
          setError(data.message || "Failed to load transcript");
        }
      } catch (err) {
        setError("Failed to load transcript");
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transcript?")) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/meet/transcripts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: id }),
      });

      if (response.ok) {
        router.push("/dashboard/transcripts");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to delete transcript");
      }
    } catch (err) {
      setError("Failed to delete transcript");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript.text_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!transcript) return;
    const blob = new Blob([transcript.text_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${transcript.meeting_code}-${new Date(transcript.created_at).toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/dashboard/transcripts"
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:bg-accent hover:text-accent-foreground px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transcripts
        </Link>

        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{error || "Transcript not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <Link
        href="/dashboard/transcripts"
        className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:bg-accent hover:text-accent-foreground px-3 py-2 rounded-lg transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transcripts
      </Link>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle className="font-mono">{transcript.meeting_code}</CardTitle>
                <Badge
                  variant={transcript.text_source === "docs" ? "default" : "secondary"}
                >
                  {transcript.text_source === "docs" ? "Google Docs" : "API Entries"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Synced on {formatDate(transcript.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Call
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Meeting Date</span>
              </div>
              <p className="font-medium">
                {transcript.meeting_end_time
                  ? new Date(transcript.meeting_end_time).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Duration</span>
              </div>
              <p className="font-medium">
                {getDuration(transcript.meeting_start_time, transcript.meeting_end_time) || "Unknown"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">Word Count</span>
              </div>
              <p className="font-medium">
                {getWordCount(transcript.text_content).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium">Entries</span>
              </div>
              <p className="font-medium">{transcript.entries_count || "N/A"}</p>
            </div>
          </div>

          {transcript.docs_document_id && (
            <div className="mt-4">
              <a
                href={`https://docs.google.com/document/d/${transcript.docs_document_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-5 py-2 text-sm font-medium border-2 border-input bg-background shadow-sm rounded-lg hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Google Docs
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Content Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transcript</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/30 p-4 rounded-xl border overflow-auto max-h-[600px]">
              {transcript.text_content}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
