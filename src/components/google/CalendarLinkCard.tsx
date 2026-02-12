"use client";

import { useState } from "react";
import {
  Calendar,
  RefreshCw,
  Settings,
  Trash2,
  ArrowRight,
  Check,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CalendarLink {
  id: string;
  calendar_id: string;
  calendar_name: string;
  google_account_email: string;
  sync_enabled: boolean;
  auto_create_sessions: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  event_filter: {
    keywords?: string[];
    minDurationMinutes?: number;
    maxDurationMinutes?: number;
    hasVideoConference?: boolean;
    excludeAllDayEvents?: boolean;
  } | null;
  templates: {
    id: string;
    name: string;
  } | null;
}

interface CalendarLinkCardProps {
  link: CalendarLink;
  onSync: (linkId: string) => Promise<void>;
  onConfigure: (link: CalendarLink) => void;
  onDelete: (linkId: string) => Promise<void>;
}

export function CalendarLinkCard({
  link,
  onSync,
  onConfigure,
  onDelete,
}: CalendarLinkCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(link.id);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this calendar link?")) return;
    setDeleting(true);
    try {
      await onDelete(link.id);
    } finally {
      setDeleting(false);
    }
  };

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getFilterSummary = () => {
    if (!link.event_filter) return null;
    const filters: string[] = [];
    if (link.event_filter.keywords?.length) {
      filters.push(`Keywords: ${link.event_filter.keywords.join(", ")}`);
    }
    if (link.event_filter.hasVideoConference) {
      filters.push("Video calls only");
    }
    if (link.event_filter.minDurationMinutes) {
      filters.push(`Min ${link.event_filter.minDurationMinutes}min`);
    }
    if (link.event_filter.maxDurationMinutes) {
      filters.push(`Max ${link.event_filter.maxDurationMinutes}min`);
    }
    return filters.length > 0 ? filters.join(" | ") : null;
  };

  const filterSummary = getFilterSummary();

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
        link.last_sync_error && "border-amber-500/30 bg-amber-500/5",
        !link.sync_enabled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Calendar → Template mapping */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium truncate">{link.calendar_name}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="secondary" className="truncate max-w-[200px]">
              {link.templates?.name || "Unknown Template"}
            </Badge>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {link.auto_create_sessions ? (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Auto-create sessions
              </Badge>
            ) : (
              <Badge variant="outline">Manual sessions</Badge>
            )}
            {!link.sync_enabled && (
              <Badge variant="secondary">Sync paused</Badge>
            )}
          </div>

          {/* Filter summary */}
          {filterSummary && (
            <p className="text-xs text-muted-foreground mb-2 truncate">
              Filters: {filterSummary}
            </p>
          )}

          {/* Last sync info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {getRelativeTime(link.last_sync_at)}
            </span>
            {link.last_sync_error && (
              <span className="text-amber-500 truncate max-w-[200px]">
                Error: {link.last_sync_error}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || !link.sync_enabled}
            className="gap-1"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Sync</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onConfigure(link)}
          >
            <Settings className="h-4 w-4" />
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
    </div>
  );
}
