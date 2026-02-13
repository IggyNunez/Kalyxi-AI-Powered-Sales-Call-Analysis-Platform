"use client";

import { useEffect, useState } from "react";
import { Users, User, Check, Plus, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface GoogleConnection {
  id: string;
  google_email: string;
  maps_to_user_id: string | null;
}

interface StepAssignProps {
  assignMode: "everyone" | "specific";
  selectedUserIds: string[];
  onAssignModeChange: (mode: "everyone" | "specific") => void;
  onSelectedUsersChange: (ids: string[]) => void;
}

export function StepAssign({
  assignMode,
  selectedUserIds,
  onAssignModeChange,
  onSelectedUsersChange,
}: StepAssignProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [connections, setConnections] = useState<GoogleConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamRes, connRes] = await Promise.all([
          fetch("/api/team?is_active=true&pageSize=100"),
          fetch("/api/google/connections"),
        ]);

        if (teamRes.ok) {
          const data = await teamRes.json();
          setTeam(data.data || []);
        }

        if (connRes.ok) {
          const data = await connRes.json();
          setConnections(data.connections || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectedUsersChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUserIds, userId]);
    }
  };

  const hasConnection = (memberId: string) => {
    return connections.some((c) => c.maps_to_user_id === memberId);
  };

  const getConnectionEmail = (memberId: string) => {
    const conn = connections.find((c) => c.maps_to_user_id === memberId);
    return conn?.google_email || null;
  };

  const handleQuickAdd = async () => {
    if (!addName.trim() || !addEmail.trim()) return;

    setAdding(true);
    setAddError(null);

    try {
      const response = await fetch("/api/team/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), email: addEmail.trim() }),
      });

      if (response.ok) {
        const { data: newUser } = await response.json();
        setTeam((prev) => [...prev, newUser]);
        // Auto-select the new user
        onSelectedUsersChange([...selectedUserIds, newUser.id]);
        setShowAddForm(false);
        setAddName("");
        setAddEmail("");
      } else {
        const data = await response.json();
        setAddError(data.error || "Failed to add team member");
      }
    } catch {
      setAddError("Failed to add team member");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h3 className="text-base font-semibold mb-1">Who should this template grade?</h3>
        <p className="text-sm text-muted-foreground">
          Assign this template to team members whose calls should be scored.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onAssignModeChange("everyone")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-200",
            assignMode === "everyone"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          )}
        >
          <Users className={cn("h-8 w-8", assignMode === "everyone" ? "text-primary" : "text-muted-foreground")} />
          <div className="text-center">
            <p className={cn("font-semibold", assignMode === "everyone" ? "text-primary" : "text-foreground")}>
              Everyone
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All team members
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onAssignModeChange("specific")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-200",
            assignMode === "specific"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/30"
          )}
        >
          <User className={cn("h-8 w-8", assignMode === "specific" ? "text-primary" : "text-muted-foreground")} />
          <div className="text-center">
            <p className={cn("font-semibold", assignMode === "specific" ? "text-primary" : "text-foreground")}>
              Specific People
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose team members
            </p>
          </div>
        </button>
      </div>

      {/* Team member list */}
      {assignMode === "specific" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Select team members ({selectedUserIds.length} selected)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1 h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add Person
            </Button>
          </div>

          {/* Quick-add form */}
          {showAddForm && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-xs font-medium">Add a new team member</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                />
              </div>
              {addError && (
                <p className="text-xs text-red-500">{addError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleQuickAdd}
                  disabled={adding || !addName.trim() || !addEmail.trim()}
                  className="h-7 text-xs gap-1"
                >
                  {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add & Select
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowAddForm(false); setAddName(""); setAddEmail(""); setAddError(null); }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Add team members above, or go to Settings → Connections to connect Google accounts and map them to people.
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-xl border p-2">
              {team.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);
                const connected = hasConnection(member.id);
                const connEmail = getConnectionEmail(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleUser(member.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg p-3 transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {(member.name || member.email).charAt(0).toUpperCase()}
                        {connected && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" title="Google account connected" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || member.email}
                        </p>
                        <div className="flex items-center gap-2">
                          {member.name && (
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          )}
                          {connected && connEmail && (
                            <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                              <Wifi className="h-2.5 w-2.5" />
                              {connEmail !== member.email && connEmail}
                            </span>
                          )}
                          {!connected && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground/50">
                              <WifiOff className="h-2.5 w-2.5" />
                              No Google account
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
