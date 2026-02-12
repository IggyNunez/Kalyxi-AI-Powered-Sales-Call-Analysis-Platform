"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarLink } from "./CalendarLinkCard";

interface Calendar {
  id: string;
  name: string;
  primary: boolean;
}

interface Template {
  id: string;
  name: string;
}

interface CalendarLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
  templates: Template[];
  editingLink: CalendarLink | null;
  onSave: (data: {
    calendar_id?: string;
    template_id?: string;
    event_filter?: {
      keywords?: string[];
      minDurationMinutes?: number;
      maxDurationMinutes?: number;
      hasVideoConference?: boolean;
      excludeAllDayEvents?: boolean;
    };
    sync_enabled?: boolean;
    auto_create_sessions?: boolean;
  }) => Promise<void>;
  existingCalendarIds: string[];
}

export function CalendarLinkDialog({
  open,
  onOpenChange,
  calendars,
  templates,
  editingLink,
  onSave,
  existingCalendarIds,
}: CalendarLinkDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoCreateSessions, setAutoCreateSessions] = useState(true);

  // Filter options
  const [keywords, setKeywords] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [requireVideoConference, setRequireVideoConference] = useState(false);
  const [excludeAllDay, setExcludeAllDay] = useState(true);

  // Reset form when dialog opens/closes or editing link changes
  useEffect(() => {
    if (open) {
      if (editingLink) {
        // Editing mode
        setCalendarId(editingLink.calendar_id);
        setTemplateId(editingLink.templates?.id || "");
        setSyncEnabled(editingLink.sync_enabled);
        setAutoCreateSessions(editingLink.auto_create_sessions);
        setKeywords(editingLink.event_filter?.keywords?.join(", ") || "");
        setMinDuration(editingLink.event_filter?.minDurationMinutes?.toString() || "");
        setMaxDuration(editingLink.event_filter?.maxDurationMinutes?.toString() || "");
        setRequireVideoConference(editingLink.event_filter?.hasVideoConference || false);
        setExcludeAllDay(editingLink.event_filter?.excludeAllDayEvents ?? true);
      } else {
        // Create mode - reset all fields
        setCalendarId("");
        setTemplateId("");
        setSyncEnabled(true);
        setAutoCreateSessions(true);
        setKeywords("");
        setMinDuration("");
        setMaxDuration("");
        setRequireVideoConference(false);
        setExcludeAllDay(true);
      }
    }
  }, [open, editingLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const eventFilter: {
        keywords?: string[];
        minDurationMinutes?: number;
        maxDurationMinutes?: number;
        hasVideoConference?: boolean;
        excludeAllDayEvents?: boolean;
      } = {};

      if (keywords.trim()) {
        eventFilter.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      }
      if (minDuration) {
        eventFilter.minDurationMinutes = parseInt(minDuration, 10);
      }
      if (maxDuration) {
        eventFilter.maxDurationMinutes = parseInt(maxDuration, 10);
      }
      if (requireVideoConference) {
        eventFilter.hasVideoConference = true;
      }
      if (excludeAllDay) {
        eventFilter.excludeAllDayEvents = true;
      }

      const data: {
        calendar_id?: string;
        template_id?: string;
        event_filter?: typeof eventFilter;
        sync_enabled?: boolean;
        auto_create_sessions?: boolean;
      } = {
        event_filter: Object.keys(eventFilter).length > 0 ? eventFilter : undefined,
        sync_enabled: syncEnabled,
        auto_create_sessions: autoCreateSessions,
      };

      // Only include these for new links
      if (!editingLink) {
        data.calendar_id = calendarId;
        data.template_id = templateId;
      }

      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save calendar link:", error);
    } finally {
      setSaving(false);
    }
  };

  // Filter out calendars that are already linked (except current one being edited)
  const availableCalendars = calendars.filter(
    (cal) => !existingCalendarIds.includes(cal.id) || cal.id === editingLink?.calendar_id
  );

  const isValid = editingLink
    ? true
    : calendarId && templateId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingLink ? "Configure Calendar Link" : "Link Calendar to Template"}
            </DialogTitle>
            <DialogDescription>
              {editingLink
                ? "Update the sync settings and filters for this calendar link."
                : "Connect a Google Calendar to a coaching template. Events matching your filters will automatically create coaching sessions."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Calendar Selection (only for new links) */}
            {!editingLink && (
              <div className="grid gap-2">
                <Label htmlFor="calendar">Google Calendar</Label>
                <Select value={calendarId} onValueChange={setCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.name} {cal.primary && "(Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Template Selection (only for new links) */}
            {!editingLink && (
              <div className="grid gap-2">
                <Label htmlFor="template">Coaching Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Display current link info when editing */}
            {editingLink && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong>Calendar:</strong> {editingLink.calendar_name}</p>
                <p><strong>Template:</strong> {editingLink.templates?.name}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Sync Options</h4>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncEnabled"
                    checked={syncEnabled}
                    onCheckedChange={(checked) => setSyncEnabled(checked === true)}
                  />
                  <Label htmlFor="syncEnabled" className="font-normal">
                    Enable automatic sync
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoCreate"
                    checked={autoCreateSessions}
                    onCheckedChange={(checked) => setAutoCreateSessions(checked === true)}
                  />
                  <Label htmlFor="autoCreate" className="font-normal">
                    Auto-create coaching sessions from events
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Event Filters</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Only events matching these filters will create coaching sessions
              </p>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., coaching, 1:1, review"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Events must contain at least one keyword in title or description
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minDuration">Min Duration (minutes)</Label>
                    <Input
                      id="minDuration"
                      type="number"
                      min="0"
                      placeholder="e.g., 15"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxDuration">Max Duration (minutes)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      min="0"
                      placeholder="e.g., 120"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requireVideo"
                      checked={requireVideoConference}
                      onCheckedChange={(checked) => setRequireVideoConference(checked === true)}
                    />
                    <Label htmlFor="requireVideo" className="font-normal">
                      Only events with video conference (Meet/Zoom)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="excludeAllDay"
                      checked={excludeAllDay}
                      onCheckedChange={(checked) => setExcludeAllDay(checked === true)}
                    />
                    <Label htmlFor="excludeAllDay" className="font-normal">
                      Exclude all-day events
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLink ? "Save Changes" : "Link Calendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
