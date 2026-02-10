"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Video,
  Copy,
  Check,
} from "lucide-react";

interface TranscriptResponse {
  ok: boolean;
  conferenceRecord?: string;
  transcript?: {
    name: string;
    state: string;
    docsDocumentId?: string;
  };
  text?: string;
  entriesCount?: number;
  warnings?: string[];
  error?: string;
  suggestion?: string;
  retryAfter?: number;
}

interface ConfigStatus {
  status: string;
  serviceAccountEmail: string | null;
  impersonateUser: string | null;
  errors?: string[];
}

export default function MeetTranscriptsPage() {
  const [meetingCode, setMeetingCode] = useState("");
  const [prefer, setPrefer] = useState<"docs" | "entries">("docs");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptResponse | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [copied, setCopied] = useState(false);

  // Check configuration status
  const checkConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/meet/transcript");
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      setConfigStatus({
        status: "error",
        serviceAccountEmail: null,
        impersonateUser: null,
        errors: [
          error instanceof Error ? error.message : "Failed to check config",
        ],
      });
    }
  }, []);

  // Fetch transcript
  const fetchTranscript = async () => {
    if (!meetingCode.trim()) {
      setResult({
        ok: false,
        error: "Please enter a meeting code",
        suggestion: 'Meeting code format: "abc-defg-hij"',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/meet/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingCode: meetingCode.trim(),
          prefer,
        }),
      });

      const data: TranscriptResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch transcript",
        suggestion: "Check your network connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy transcript to clipboard
  const copyToClipboard = async () => {
    if (result?.text) {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download transcript as text file
  const downloadTranscript = () => {
    if (result?.text) {
      const blob = new Blob([result.text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-${meetingCode.replace(/-/g, "")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Get state badge color
  const getStateBadge = (state: string) => {
    switch (state) {
      case "FILE_GENERATED":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "ENDED":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        );
      case "STARTED":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {state}
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Google Meet Transcripts
        </h1>
        <p className="text-muted-foreground">
          Fetch transcripts from Google Meet recordings using the Meet REST API.
        </p>
      </div>

      {/* Configuration Status Card */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Integration Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={checkConfig}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {configStatus.status === "configured" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-medium">
                  {configStatus.status === "configured"
                    ? "Configured"
                    : "Not Configured"}
                </span>
              </div>
              {configStatus.serviceAccountEmail && (
                <p className="text-xs text-muted-foreground">
                  Service Account: {configStatus.serviceAccountEmail}
                </p>
              )}
              {configStatus.impersonateUser && (
                <p className="text-xs text-muted-foreground">
                  Impersonating: {configStatus.impersonateUser}
                </p>
              )}
              {configStatus.errors && configStatus.errors.length > 0 && (
                <div className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {configStatus.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click &quot;Check&quot; to verify the Google Meet integration
              configuration.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fetch Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Fetch Transcript
          </CardTitle>
          <CardDescription>
            Enter your Google Meet meeting code to retrieve the transcript.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="abc-defg-hij"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              className="flex-1 font-mono"
              onKeyDown={(e) => e.key === "Enter" && fetchTranscript()}
            />
            <Button
              onClick={fetchTranscript}
              disabled={loading}
              loading={loading}
            >
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Prefer source:
            </span>
            <div className="flex gap-2">
              <Button
                variant={prefer === "docs" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrefer("docs")}
              >
                Google Docs
              </Button>
              <Button
                variant={prefer === "entries" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrefer("entries")}
              >
                Raw Entries
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>Docs:</strong> Uses the formatted Google Docs transcript
            (recommended). <br />
            <strong>Entries:</strong> Uses raw transcript entries with
            timestamps.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card variant={result.ok ? "default" : "default"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                {result.ok ? "Transcript Retrieved" : "Error"}
              </CardTitle>
              {result.ok && result.text && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTranscript}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Display */}
            {!result.ok && (
              <div className="space-y-2">
                <p className="font-medium text-red-600 dark:text-red-400">
                  {result.error}
                </p>
                {result.suggestion && (
                  <p className="text-sm text-muted-foreground">
                    {result.suggestion}
                  </p>
                )}
                {result.retryAfter && (
                  <p className="text-sm text-amber-600">
                    Rate limited. Retry after {result.retryAfter} seconds.
                  </p>
                )}
              </div>
            )}

            {/* Success Display */}
            {result.ok && (
              <>
                {/* Metadata */}
                <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
                  {result.transcript && (
                    <>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Status
                        </p>
                        <div className="mt-1">
                          {getStateBadge(result.transcript.state)}
                        </div>
                      </div>
                      {result.transcript.docsDocumentId && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Google Docs
                          </p>
                          <a
                            href={`https://docs.google.com/document/d/${result.transcript.docsDocumentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center text-sm text-primary hover:underline"
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            Open in Docs
                          </a>
                        </div>
                      )}
                    </>
                  )}
                  {result.entriesCount !== undefined && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Entries
                      </p>
                      <p className="mt-1 text-sm">{result.entriesCount}</p>
                    </div>
                  )}
                  {result.conferenceRecord && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Conference Record
                      </p>
                      <p className="mt-1 truncate font-mono text-xs">
                        {result.conferenceRecord}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    <p className="font-medium">Warnings:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Transcript Text */}
                {result.text && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Transcript Content:</p>
                    <div className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-4">
                      <pre className="whitespace-pre-wrap font-mono text-sm">
                        {result.text || "(No text content)"}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result.text.length.toLocaleString()} characters
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              Find your meeting code from the Google Meet URL (e.g.,{" "}
              <code className="rounded bg-muted px-1">
                meet.google.com/abc-defg-hij
              </code>
              )
            </li>
            <li>Enter the meeting code in the format: abc-defg-hij</li>
            <li>
              Click &quot;Fetch&quot; to retrieve the transcript
            </li>
            <li>
              If the transcript is still processing, wait a few minutes and try
              again
            </li>
          </ol>
          <div className="rounded-md bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <p className="font-medium">Note:</p>
            <p className="mt-1">
              Transcripts are only available for meetings where transcription
              was enabled, and the impersonated user must have access to the
              meeting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
