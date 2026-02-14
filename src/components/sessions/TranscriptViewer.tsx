"use client";

import { useState } from "react";
import {
  Video,
  Clock,
  Users,
  Copy,
  Download,
  Check,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MeetingInfo {
  meetingCode?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  participants?: Record<string, unknown> | Array<Record<string, unknown>>;
  spaceName?: string;
  textSource?: string;
  entriesCount?: number;
  customerName?: string;
  customerCompany?: string;
}

interface TranscriptViewerProps {
  transcript: string;
  meetingInfo?: MeetingInfo | null;
  className?: string;
}

function formatDurationMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function getParticipantCount(participants: MeetingInfo["participants"]): number {
  if (!participants) return 0;
  if (Array.isArray(participants)) return participants.length;
  return Object.keys(participants).length;
}

// Parse transcript into lines with speaker detection
function parseTranscript(text: string): Array<{ speaker: string | null; text: string }> {
  const lines = text.split("\n");
  const parsed: Array<{ speaker: string | null; text: string }> = [];

  // Common speaker patterns: "Speaker 1:", "John Smith:", "SPEAKER_01:", timestamps like "[00:01:23]"
  const speakerPattern = /^(?:\[[\d:]+\]\s*)?([A-Za-z][A-Za-z0-9 _.'-]{0,40}):\s*(.+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      parsed.push({ speaker: null, text: "" });
      continue;
    }

    const match = trimmed.match(speakerPattern);
    if (match) {
      parsed.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else {
      parsed.push({ speaker: null, text: trimmed });
    }
  }

  return parsed;
}

// Assign stable colors to speakers
const speakerColors = [
  "text-indigo-600",
  "text-emerald-600",
  "text-amber-600",
  "text-rose-600",
  "text-cyan-600",
  "text-purple-600",
];

export function TranscriptViewer({ transcript, meetingInfo, className }: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);
  const parsed = parseTranscript(transcript);

  // Build speaker color map
  const speakerMap = new Map<string, string>();
  let colorIndex = 0;
  for (const line of parsed) {
    if (line.speaker && !speakerMap.has(line.speaker)) {
      speakerMap.set(line.speaker, speakerColors[colorIndex % speakerColors.length]);
      colorIndex++;
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${meetingInfo?.meetingCode || "session"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const participantCount = getParticipantCount(meetingInfo?.participants);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-gray-600" />
            Call Transcript
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Meeting metadata */}
        {meetingInfo && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {meetingInfo.meetingCode && (
              <Badge variant="outline" className="text-xs font-mono">
                {meetingInfo.meetingCode}
              </Badge>
            )}
            {meetingInfo.startTime && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(meetingInfo.startTime), "MMM d, yyyy h:mm a")}
              </span>
            )}
            {meetingInfo.duration && meetingInfo.duration > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {formatDurationMinutes(meetingInfo.duration)}
              </span>
            )}
            {participantCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="h-3.5 w-3.5" />
                {participantCount} participant{participantCount !== 1 ? "s" : ""}
              </span>
            )}
            {meetingInfo.customerName && (
              <Badge variant="secondary" className="text-xs">
                {meetingInfo.customerName}
                {meetingInfo.customerCompany ? ` @ ${meetingInfo.customerCompany}` : ""}
              </Badge>
            )}
            {meetingInfo.textSource && (
              <Badge variant="outline" className="text-xs text-gray-400">
                Source: {meetingInfo.textSource}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6 space-y-1">
            {parsed.map((line, index) => {
              if (!line.text && !line.speaker) {
                return <div key={index} className="h-3" />;
              }

              if (line.speaker) {
                const color = speakerMap.get(line.speaker) || "text-gray-600";
                return (
                  <div key={index} className="py-1.5">
                    <span className={cn("font-semibold text-sm", color)}>
                      {line.speaker}:
                    </span>{" "}
                    <span className="text-gray-700 text-sm leading-relaxed">
                      {line.text}
                    </span>
                  </div>
                );
              }

              return (
                <p key={index} className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {line.text}
                </p>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
