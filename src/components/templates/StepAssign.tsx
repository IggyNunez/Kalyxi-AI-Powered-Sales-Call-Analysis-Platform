"use client";

import { useEffect, useState } from "react";
import { Users, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  role: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch("/api/team?is_active=true&pageSize=100");
        if (res.ok) {
          const data = await res.json();
          setTeam(data.data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectedUsersChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUserIds, userId]);
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
          <p className="text-sm font-medium">
            Select team members ({selectedUserIds.length} selected)
          </p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No team members found. Invite people from Settings first.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-xl border p-2">
              {team.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);
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
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {(member.name || member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || member.email}
                        </p>
                        {member.name && (
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        )}
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
