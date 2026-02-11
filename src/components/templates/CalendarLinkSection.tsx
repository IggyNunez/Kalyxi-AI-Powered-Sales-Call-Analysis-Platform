"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Settings2,
  Check,
  AlertCircle,
  Clock,
  Video,
  Filter,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GoogleCalendar {
  id: string;
  name: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
}

interface EventFilter {
  keywords?: string[];
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  hasVideoConference?: boolean;
  excludeAllDayEvents?: boolean;
}

interface CalendarLink {
  id: string;
  calendar_id: string;
  calendar_name: string;
  google_account_email: string;
  event_filter: EventFilter | null;
  sync_enabled: boolean;
  auto_create_sessions: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

interface CalendarLinkSectionProps {
  templateId: string;
  disabled?: boolean;
}

export default function CalendarLinkSection({
  templateId,
  disabled = false,
}: CalendarLinkSectionProps) {
  const [links, setLinks] = useState<CalendarLink[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");
  const [newLinkFilters, setNewLinkFilters] = useState<EventFilter>({
    hasVideoConference: true,
    excludeAllDayEvents: true,
    minDurationMinutes: 15,
  });
  const [autoCreateSessions, setAutoCreateSessions] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [keywordInput, setKeywordInput] = useState("");

  // Fetch links and calendars
  useEffect(() => {
    fetchData();
  }, [templateId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing links
      const linksRes = await fetch(`/api/calendar/link?template_id=${templateId}`);
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setLinks(linksData.data || []);
      }

      // Fetch available calendars
      const calendarsRes = await fetch("/api/calendar/calendars");
      if (calendarsRes.ok) {
        const calendarsData = await calendarsRes.json();
        setCalendars(calendarsData.data?.calendars || []);
        setGoogleEmail(calendarsData.data?.google_email || null);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedCalendar) return;

    setCreating(true);
    try {
      const res = await fetch("/api/calendar/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          calendar_id: selectedCalendar,
          event_filter: newLinkFilters,
          sync_enabled: syncEnabled,
          auto_create_sessions: autoCreateSessions,
        }),
      });

      if (res.ok) {
        await fetchData();
        setAddDialogOpen(false);
        setSelectedCalendar("");
        setNewLinkFilters({
          hasVideoConference: true,
          excludeAllDayEvents: true,
          minDurationMinutes: 15,
        });
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create calendar link");
      }
    } catch (error) {
      console.error("Error creating calendar link:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this calendar link?")) return;

    try {
      const res = await fetch(`/api/calendar/link/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLinks(links.filter((l) => l.id !== linkId));
      }
    } catch (error) {
      console.error("Error deleting calendar link:", error);
    }
  };

  const handleSyncNow = async (linkId: string) => {
    setSyncingId(linkId);
    try {
      const res = await fetch(`/api/calendar/link/${linkId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowHours: 168 }), // 7 days
      });

      if (res.ok) {
        const result = await res.json();
        await fetchData(); // Refresh to get updated sync time
        if (result.data.sessionsCreated > 0) {
          alert(`Sync complete! ${result.data.sessionsCreated} new sessions created.`);
        } else {
          alert(`Sync complete! No new sessions to create.`);
        }
      }
    } catch (error) {
      console.error("Error syncing calendar:", error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleSyncEnabled = async (linkId: string, enabled: boolean) => {
    try {
      await fetch(`/api/calendar/link/${linkId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_enabled: enabled }),
      });
      setLinks(links.map((l) => (l.id === linkId ? { ...l, sync_enabled: enabled } : l)));
    } catch (error) {
      console.error("Error updating calendar link:", error);
    }
  };

  const toggleExpandedFilters = (linkId: string) => {
    setExpandedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setNewLinkFilters((prev) => ({
        ...prev,
        keywords: [...(prev.keywords || []), keywordInput.trim()],
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (index: number) => {
    setNewLinkFilters((prev) => ({
      ...prev,
      keywords: prev.keywords?.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading calendar integration...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!googleEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google account to automatically create sessions from calendar events.
            </p>
            <a
              href="/api/google/connect?redirect=/dashboard/templates"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:-translate-y-0.5 h-10 px-5 py-2"
            >
              Connect Google Account
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Link Calendar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Link Calendar to Template</DialogTitle>
                  <DialogDescription>
                    Create sessions automatically from calendar events
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Calendar Selection */}
                  <div className="space-y-2">
                    <Label>Calendar</Label>
                    <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: cal.backgroundColor || "#4285f4" }}
                              />
                              {cal.name}
                              {cal.primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event Filters */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Event Filters
                    </Label>

                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                      {/* Video Conference */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="videoConf" className="text-sm font-normal flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          Only video conference events
                        </Label>
                        <Switch
                          id="videoConf"
                          checked={newLinkFilters.hasVideoConference}
                          onCheckedChange={(checked) =>
                            setNewLinkFilters((prev) => ({ ...prev, hasVideoConference: checked }))
                          }
                        />
                      </div>

                      {/* Exclude All-Day */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="allDay" className="text-sm font-normal">
                          Exclude all-day events
                        </Label>
                        <Switch
                          id="allDay"
                          checked={newLinkFilters.excludeAllDayEvents}
                          onCheckedChange={(checked) =>
                            setNewLinkFilters((prev) => ({ ...prev, excludeAllDayEvents: checked }))
                          }
                        />
                      </div>

                      {/* Min Duration */}
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="minDuration" className="text-sm font-normal flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Minimum duration
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="minDuration"
                            type="number"
                            min={0}
                            value={newLinkFilters.minDurationMinutes || ""}
                            onChange={(e) =>
                              setNewLinkFilters((prev) => ({
                                ...prev,
                                minDurationMinutes: parseInt(e.target.value) || undefined,
                              }))
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">min</span>
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="space-y-2">
                        <Label className="text-sm font-normal">Keywords (optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., call, meeting"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                            Add
                          </Button>
                        </div>
                        {newLinkFilters.keywords && newLinkFilters.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {newLinkFilters.keywords.map((kw, i) => (
                              <Badge key={i} variant="secondary" className="gap-1">
                                {kw}
                                <button
                                  onClick={() => removeKeyword(i)}
                                  className="hover:text-destructive"
                                >
                                  &times;
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sync Options */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="syncEnabled" className="text-sm font-normal">
                        Enable automatic sync
                      </Label>
                      <Switch
                        id="syncEnabled"
                        checked={syncEnabled}
                        onCheckedChange={setSyncEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoCreate" className="text-sm font-normal">
                        Auto-create sessions from events
                      </Label>
                      <Switch
                        id="autoCreate"
                        checked={autoCreateSessions}
                        onCheckedChange={setAutoCreateSessions}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateLink}
                    disabled={!selectedCalendar || creating}
                  >
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Link Calendar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Connected as <span className="font-medium">{googleEmail}</span>
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {links.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calendars linked yet</p>
              <p className="text-xs mt-1">
                Link a calendar to automatically create scoring sessions
              </p>
            </div>
          ) : (
            links.map((link) => (
              <Card key={link.id} className={cn(!link.sync_enabled && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium truncate">{link.calendar_name}</span>
                        {link.sync_enabled ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Check className="h-3 w-3" />
                            Syncing
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {link.google_account_email}
                        </span>
                        {link.last_sync_at && (
                          <span>
                            Last synced: {format(new Date(link.last_sync_at), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>

                      {link.last_sync_error && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          {link.last_sync_error}
                        </div>
                      )}

                      {/* Filters Summary */}
                      <Collapsible
                        open={expandedFilters.has(link.id)}
                        onOpenChange={() => toggleExpandedFilters(link.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 h-auto p-1 text-xs gap-1">
                            <Settings2 className="h-3 w-3" />
                            Filters
                            {expandedFilters.has(link.id) ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                            {link.event_filter?.hasVideoConference && (
                              <div className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Video conferences only
                              </div>
                            )}
                            {link.event_filter?.excludeAllDayEvents && (
                              <div>Excluding all-day events</div>
                            )}
                            {link.event_filter?.minDurationMinutes && (
                              <div>Min duration: {link.event_filter.minDurationMinutes}min</div>
                            )}
                            {link.event_filter?.keywords && link.event_filter.keywords.length > 0 && (
                              <div>Keywords: {link.event_filter.keywords.join(", ")}</div>
                            )}
                            {!link.event_filter && <div>No filters applied</div>}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSyncNow(link.id)}
                            disabled={syncingId === link.id || disabled}
                          >
                            {syncingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sync now</TooltipContent>
                      </Tooltip>

                      <Switch
                        checked={link.sync_enabled}
                        onCheckedChange={(checked) => handleToggleSyncEnabled(link.id, checked)}
                        disabled={disabled}
                      />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={disabled}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove link</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
