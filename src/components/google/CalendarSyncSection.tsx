"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarLinkCard, CalendarLink } from "./CalendarLinkCard";
import { CalendarLinkDialog } from "./CalendarLinkDialog";

interface Calendar {
  id: string;
  name: string;
  primary: boolean;
}

interface Template {
  id: string;
  name: string;
}

interface CalendarSyncSectionProps {
  hasConnection: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function CalendarSyncSection({
  hasConnection,
  onSuccess,
  onError,
}: CalendarSyncSectionProps) {
  const [links, setLinks] = useState<CalendarLink[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CalendarLink | null>(null);

  // Fetch calendar links
  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/link");
      if (response.ok) {
        const data = await response.json();
        setLinks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch calendar links:", error);
    }
  }, []);

  // Fetch user's Google calendars
  const fetchCalendars = useCallback(async () => {
    if (!hasConnection) return;
    try {
      const response = await fetch("/api/calendar/calendars");
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.data?.calendars || []);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    }
  }, [hasConnection]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLinks(), fetchCalendars(), fetchTemplates()]);
      setLoading(false);
    };
    loadData();
  }, [fetchLinks, fetchCalendars, fetchTemplates]);

  // Refresh calendars when connection changes
  useEffect(() => {
    if (hasConnection) {
      fetchCalendars();
    }
  }, [hasConnection, fetchCalendars]);

  const handleSync = async (linkId: string) => {
    try {
      const response = await fetch(`/api/calendar/link/${linkId}/sync`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        const created = data.data?.sessionsCreated || 0;
        onSuccess(
          created > 0
            ? `Sync complete - ${created} session(s) created`
            : "Sync complete - no new sessions"
        );
        fetchLinks();
      } else {
        onError(data.message || "Sync failed");
      }
    } catch (error) {
      onError("Sync failed");
    }
  };

  const handleConfigure = (link: CalendarLink) => {
    setEditingLink(link);
    setDialogOpen(true);
  };

  const handleDelete = async (linkId: string) => {
    try {
      const response = await fetch(`/api/calendar/link/${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
        onSuccess("Calendar link removed");
      } else {
        const data = await response.json();
        onError(data.message || "Failed to remove calendar link");
      }
    } catch (error) {
      onError("Failed to remove calendar link");
    }
  };

  const handleOpenDialog = () => {
    setEditingLink(null);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    calendar_id?: string;
    template_id?: string;
    event_filter?: Record<string, unknown>;
    sync_enabled?: boolean;
    auto_create_sessions?: boolean;
  }) => {
    try {
      if (editingLink) {
        // Update existing link
        const response = await fetch(`/api/calendar/link/${editingLink.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || "Failed to update");
        }

        onSuccess("Calendar link updated");
      } else {
        // Create new link
        const response = await fetch("/api/calendar/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || "Failed to create");
        }

        onSuccess("Calendar linked successfully");
      }

      fetchLinks();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Operation failed");
      throw error;
    }
  };

  const existingCalendarIds = links.map((l) => l.calendar_id);

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Calendar Sync Settings
            </CardTitle>
            <CardDescription>
              Link your Google calendars to coaching templates for automated session creation
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenDialog}
            variant="gradient"
            className="gap-2"
            disabled={!hasConnection || calendars.length === 0 || templates.length === 0}
          >
            <Plus className="h-4 w-4" />
            Link Calendar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasConnection ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Google account connected</p>
              <p className="text-sm mt-1">
                Connect your Google account above to set up calendar sync
              </p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No calendars linked</p>
              <p className="text-sm mt-1">
                Link a calendar to a template to start syncing events
              </p>
              {calendars.length === 0 && (
                <p className="text-xs text-amber-500 mt-2">
                  No calendars found. Make sure you have calendars in your Google account.
                </p>
              )}
              {templates.length === 0 && (
                <p className="text-xs text-amber-500 mt-2">
                  No templates found. Create a coaching template first.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <CalendarLinkCard
                  key={link.id}
                  link={link}
                  onSync={handleSync}
                  onConfigure={handleConfigure}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CalendarLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        calendars={calendars}
        templates={templates}
        editingLink={editingLink}
        onSave={handleSave}
        existingCalendarIds={existingCalendarIds}
      />
    </>
  );
}
