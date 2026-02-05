"use client";

import Link from "next/link";
import { Phone, Clock, Calendar, User, Building, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatDate, getScoreColor } from "@/lib/utils";
import type { Call } from "@/types";

interface CallCardProps {
  call: Call;
}

export function CallCard({ call }: CallCardProps) {
  const statusColors = {
    pending: "warning",
    processing: "secondary",
    analyzed: "success",
    failed: "destructive",
  } as const;

  const statusLabels = {
    pending: "Pending",
    processing: "Processing",
    analyzed: "Analyzed",
    failed: "Failed",
  };

  // Get the latest analysis if available
  const analysis = call.analyses?.[0];
  const title = call.title || call.customer_name || call.customer_company || "Untitled Call";
  const callDate = call.call_timestamp ? new Date(call.call_timestamp) : new Date(call.created_at);

  return (
    <Link href={`/dashboard/calls/${call.id}`}>
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Phone className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold line-clamp-1">{title}</h3>
                {call.caller?.name && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {call.caller.name}
                    {call.caller.team && (
                      <span className="text-gray-400">• {call.caller.team}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={statusColors[call.status]}>
              {statusLabels[call.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {call.customer_company && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="h-4 w-4" />
                <span className="truncate">{call.customer_company}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(callDate)}</span>
            </div>
            {call.duration && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(call.duration)}</span>
              </div>
            )}
            {analysis?.overall_score !== undefined && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className={getScoreColor(analysis.overall_score)}>
                  Score: {analysis.overall_score}%
                </span>
              </div>
            )}
          </div>
          {analysis?.summary && (
            <p className="mt-3 line-clamp-2 text-sm text-gray-600">
              {analysis.summary}
            </p>
          )}
          {!analysis && call.raw_notes && (
            <p className="mt-3 line-clamp-2 text-sm text-gray-500 italic">
              {call.raw_notes.substring(0, 150)}...
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
