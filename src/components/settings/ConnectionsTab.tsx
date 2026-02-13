"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Mail,
  Copy,
  Eye,
  EyeOff,
  Key,
  ExternalLink,
  Chrome,
} from "lucide-react";
import { CalendarSyncSection } from "@/components/google";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GoogleConnection {
  id: string;
  google_email: string;
  scopes: string[];
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  is_token_valid: boolean;
  maps_to_user_id: string | null;
}

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface ExtensionToken {
  id: string;
  token_prefix: string;
  name: string;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function ConnectionsTab() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<GoogleConnection[]>([]);
  const [tokens, setTokens] = useState<ExtensionToken[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickAddFor, setQuickAddFor] = useState<string | null>(null);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddEmail, setQuickAddEmail] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  const [newlyConnectedEmail, setNewlyConnectedEmail] = useState<string | null>(null);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get("success");
    const email = searchParams.get("email");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (success === "true" && email) {
      setSuccessMessage(`Successfully connected ${email}`);
      setNewlyConnectedEmail(email);
      window.history.replaceState({}, "", "/dashboard/settings?tab=connections");
    } else if (error) {
      setErrorMessage(errorDescription || `OAuth error: ${error}`);
      window.history.replaceState({}, "", "/dashboard/settings?tab=connections");
    }
  }, [searchParams]);

  // Auto-match newly connected Google email to existing team member
  useEffect(() => {
    if (!newlyConnectedEmail || connections.length === 0 || teamMembers.length === 0) return;

    const connection = connections.find(
      (c) => c.google_email === newlyConnectedEmail && !c.maps_to_user_id
    );
    if (!connection) {
      setNewlyConnectedEmail(null);
      return;
    }

    const matchingMember = teamMembers.find(
      (m) => m.email.toLowerCase() === newlyConnectedEmail.toLowerCase()
    );

    if (matchingMember) {
      // Auto-assign the connection to the matching team member
      handleAttributionChange(connection.id, matchingMember.id);
      setSuccessMessage(
        `Connected ${newlyConnectedEmail} and auto-assigned to ${matchingMember.name || matchingMember.email}`
      );
    } else {
      // Prompt user to assign - open the quick-add form for this connection
      setQuickAddFor(connection.id);
      setQuickAddEmail(newlyConnectedEmail);
      setQuickAddName("");
    }

    setNewlyConnectedEmail(null);
  }, [newlyConnectedEmail, connections, teamMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionsRes, tokensRes, teamRes] = await Promise.all([
        fetch("/api/google/connections"),
        fetch("/api/extension/token"),
        fetch("/api/team?is_active=true&pageSize=100"),
      ]);

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        setTokens(data.tokens || []);
      }

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleConnect = () => {
    window.location.href = "/api/google/connect";
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Are you sure you want to disconnect this Google account?")) return;

    setDeleting(connectionId);
    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        setSuccessMessage("Google account disconnected successfully");
      } else {
        const data = await response.json();
        setErrorMessage(data.message || "Failed to disconnect account");
      }
    } catch {
      setErrorMessage("Failed to disconnect account");
    } finally {
      setDeleting(null);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch("/api/meet/sync-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      const data = await response.json();

      if (response.ok) {
        const saved = data.summary?.transcriptsSaved || 0;
        setSuccessMessage(
          saved > 0
            ? `Synced ${saved} new transcript(s)`
            : "Sync complete - no new transcripts found"
        );
        fetchData();
      } else {
        setErrorMessage(data.message || "Sync failed");
      }
    } catch {
      setErrorMessage("Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleCreateToken = async () => {
    setCreatingToken(true);
    setNewToken(null);
    try {
      const response = await fetch("/api/extension/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chrome Extension" }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewToken(data.token);
        setTokens((prev) => [data.tokenInfo, ...prev]);
        setSuccessMessage("Extension token created - copy it now!");
      } else {
        setErrorMessage(data.message || "Failed to create token");
      }
    } catch {
      setErrorMessage("Failed to create token");
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this token?")) return;

    try {
      const response = await fetch("/api/extension/token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });

      if (response.ok) {
        setTokens((prev) =>
          prev.map((t) => (t.id === tokenId ? { ...t, is_active: false } : t))
        );
        setSuccessMessage("Token revoked");
      } else {
        const data = await response.json();
        setErrorMessage(data.message || "Failed to revoke token");
      }
    } catch {
      setErrorMessage("Failed to revoke token");
    }
  };

  const handleAttributionChange = async (connectionId: string, userId: string | null) => {
    try {
      const response = await fetch(`/api/google/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maps_to_user_id: userId }),
      });

      if (response.ok) {
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId ? { ...c, maps_to_user_id: userId } : c
          )
        );
        const userName = teamMembers.find((m) => m.id === userId);
        setSuccessMessage(
          userId
            ? `Calls will be graded for ${userName?.name || userName?.email || "selected user"}`
            : "Attribution cleared"
        );
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to update attribution");
      }
    } catch {
      setErrorMessage("Failed to update attribution");
    }
  };

  const handleQuickAdd = async (connectionId: string) => {
    if (!quickAddName.trim() || !quickAddEmail.trim()) return;

    setQuickAdding(true);
    try {
      const response = await fetch("/api/team/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickAddName.trim(), email: quickAddEmail.trim() }),
      });

      if (response.ok) {
        const { data: newUser } = await response.json();
        setTeamMembers((prev) => [...prev, newUser]);

        // Auto-assign this connection to the new user
        await handleAttributionChange(connectionId, newUser.id);

        setQuickAddFor(null);
        setQuickAddName("");
        setQuickAddEmail("");
        setSuccessMessage(`Added ${newUser.name} and assigned this Google account`);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to add team member");
      }
    } catch {
      setErrorMessage("Failed to add team member");
    } finally {
      setQuickAdding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage("Copied to clipboard");
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Google Connections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Google Accounts</CardTitle>
            <CardDescription>
              Link your Google accounts to sync transcripts from Google Meet
            </CardDescription>
          </div>
          <Button onClick={handleConnect} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Connect Account
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Google accounts connected</p>
              <p className="text-sm mt-1">Connect your Google account to start syncing transcripts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={cn(
                    "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
                    !connection.is_token_valid && "border-amber-500/30 bg-amber-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{connection.google_email}</span>
                        {connection.is_token_valid ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Reconnect Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last sync: {getRelativeTime(connection.last_sync_at)}
                        </span>
                        {connection.last_sync_error && (
                          <span className="text-amber-500 truncate max-w-[200px]">
                            Error: {connection.last_sync_error}
                          </span>
                        )}
                      </div>

                      {/* Attribution dropdown */}
                      <div className="flex items-center gap-2 mt-3">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          Grade calls for:
                        </Label>
                        <select
                          value={connection.maps_to_user_id || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "__add_new__") {
                              setQuickAddFor(connection.id);
                              setQuickAddEmail(connection.google_email);
                              setQuickAddName("");
                            } else {
                              handleAttributionChange(connection.id, value || null);
                            }
                          }}
                          className="h-8 rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary max-w-[220px]"
                        >
                          <option value="">— Not assigned —</option>
                          {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name || member.email}
                            </option>
                          ))}
                          <option value="__add_new__">+ Add new person...</option>
                        </select>
                      </div>

                      {/* Quick-add form */}
                      {quickAddFor === connection.id && (
                        <div className="mt-3 p-3 rounded-lg border bg-muted/30 space-y-2">
                          <p className="text-xs font-medium">Add a new team member</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Name"
                              value={quickAddName}
                              onChange={(e) => setQuickAddName(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={quickAddEmail}
                              onChange={(e) => setQuickAddEmail(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleQuickAdd(connection.id)}
                              disabled={quickAdding || !quickAddName.trim() || !quickAddEmail.trim()}
                              className="h-7 text-xs gap-1"
                            >
                              {quickAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              Add & Assign
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setQuickAddFor(null); setQuickAddName(""); setQuickAddEmail(""); }}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connection.id)}
                        disabled={syncing === connection.id || !connection.is_token_valid}
                        className="gap-1"
                      >
                        {syncing === connection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Sync Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={deleting === connection.id}
                      >
                        {deleting === connection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Sync */}
      <CalendarSyncSection
        hasConnection={connections.length > 0}
        onSuccess={setSuccessMessage}
        onError={setErrorMessage}
      />

      {/* Extension Tokens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Extension API Tokens
            </CardTitle>
            <CardDescription>
              Generate tokens for the Chrome extension to sync transcripts automatically
            </CardDescription>
          </div>
          <Button
            onClick={handleCreateToken}
            variant="outline"
            className="gap-2"
            disabled={creatingToken}
          >
            {creatingToken ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Token
          </Button>
        </CardHeader>
        <CardContent>
          {newToken && (
            <div className="mb-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Your New Token (copy it now!)</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  type={showToken ? "text" : "password"}
                  value={newToken}
                  readOnly
                  className="font-mono text-sm bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This token will only be shown once. Save it in your Chrome extension settings.
              </p>
            </div>
          )}

          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No extension tokens</p>
              <p className="text-sm mt-1">Create a token to use with the Chrome extension</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border bg-card",
                    !token.is_active && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {token.token_prefix}...
                    </code>
                    <div className="text-sm">
                      <p className="font-medium">{token.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Used {token.use_count} times
                        {token.last_used_at && ` • Last: ${getRelativeTime(token.last_used_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!token.is_active ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : token.expires_at && new Date(token.expires_at) < new Date() ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <>
                        <Badge variant="default">Active</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeToken(token.id)}
                        >
                          Revoke
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chrome Extension Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-indigo-500/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Chrome className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Kalyxi Chrome Extension</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Install the Chrome extension to automatically sync transcripts when your Google Meet calls end.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Install Extension
                </Button>
                <Button variant="ghost" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Setup Guide
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
