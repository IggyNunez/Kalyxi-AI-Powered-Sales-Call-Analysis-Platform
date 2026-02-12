"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Ban,
  KeyRound,
  Shield,
  TrendingUp,
  Calendar,
  Phone,
  ClipboardCheck,
} from "lucide-react";
import type { UserAnalytics, SimplifiedRole } from "@/types/analytics";

interface UserDetailModalProps {
  user: UserAnalytics | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailModal({
  user,
  open,
  onOpenChange,
}: UserDetailModalProps) {
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SimplifiedRole | null>(null);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-500/20 text-purple-300";
      case "admin":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const handleRoleChange = async () => {
    if (!selectedRole || selectedRole === user.role) return;

    setIsChangingRole(true);
    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change role");
      }

      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to change role:", error);
      alert(error instanceof Error ? error.message : "Failed to change role");
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(`Are you sure you want to ${user.suspended ? "unsuspend" : "suspend"} ${user.name}?`)) {
      return;
    }

    setIsSuspending(true);
    try {
      const response = await fetch(`/api/users/${user.id}/suspend`, {
        method: user.suspended ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Suspended by admin" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update suspension status");
      }

      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update suspension:", error);
      alert(error instanceof Error ? error.message : "Failed to update suspension status");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send reset email");
      }

      alert("Password reset email sent successfully");
    } catch (error) {
      console.error("Failed to send reset email:", error);
      alert(error instanceof Error ? error.message : "Failed to send reset email");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="sr-only">User Details</DialogTitle>
        </DialogHeader>

        {/* User Header */}
        <div className="flex items-start gap-4 border-b border-gray-800 pb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gray-700 text-xl text-gray-200">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <Badge className={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              {user.suspended && (
                <Badge className="bg-red-500/20 text-red-300">Suspended</Badge>
              )}
            </div>
            <p className="text-gray-400">{user.email}</p>
            <p className="mt-1 text-xs text-gray-500">
              Joined {new Date(user.createdAt).toLocaleDateString()}
              {user.lastActive && (
                <> · Last active {new Date(user.lastActive).toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Sessions Stats */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                    <ClipboardCheck className="h-4 w-4" />
                    Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {user.totalSessions}
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.completedSessions} completed
                  </p>
                </CardContent>
              </Card>

              {/* Calls Stats */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="h-4 w-4" />
                    Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {user.totalCalls}
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.analyzedCalls} analyzed
                  </p>
                </CardContent>
              </Card>

              {/* Average Score */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingUp className="h-4 w-4" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      user.averageScore
                    )}`}
                  >
                    {user.averageScore !== null
                      ? `${user.averageScore.toFixed(1)}%`
                      : "N/A"}
                  </div>
                  <p className="text-xs text-gray-500">Overall performance</p>
                </CardContent>
              </Card>

              {/* Pass Rate */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-gray-400">
                    <Shield className="h-4 w-4" />
                    Pass Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${getScoreColor(
                      user.passRate
                    )}`}
                  >
                    {user.passRate !== null
                      ? `${user.passRate.toFixed(0)}%`
                      : "N/A"}
                  </div>
                  <p className="text-xs text-gray-500">Sessions passed</p>
                </CardContent>
              </Card>
            </div>

            {/* Coaching Stats (if admin) */}
            {user.role === "admin" && user.sessionsCoached > 0 && (
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400">
                    Coaching Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {user.sessionsCoached}
                      </div>
                      <p className="text-xs text-gray-500">Sessions coached</p>
                    </div>
                    <div>
                      <div
                        className={`text-lg font-bold ${getScoreColor(
                          user.avgCoachingScore
                        )}`}
                      >
                        {user.avgCoachingScore !== null
                          ? `${user.avgCoachingScore.toFixed(1)}%`
                          : "N/A"}
                      </div>
                      <p className="text-xs text-gray-500">Avg score given</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4">
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="py-8 text-center text-gray-400">
                <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Performance trends coming soon</p>
                <p className="text-xs text-gray-500">
                  Historical data and charts will be displayed here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="mt-4 space-y-4">
            {/* Change Role */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  Change Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedRole || user.role}
                    onValueChange={(value) =>
                      setSelectedRole(value as SimplifiedRole)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRoleChange}
                    disabled={
                      isChangingRole ||
                      !selectedRole ||
                      selectedRole === user.role
                    }
                  >
                    {isChangingRole ? "Saving..." : "Save"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Admins can manage templates, sessions, and view team analytics
                </p>
              </CardContent>
            </Card>

            {/* Suspend/Unsuspend */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Ban className="h-4 w-4" />
                  {user.suspended ? "Unsuspend User" : "Suspend User"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant={user.suspended ? "outline" : "destructive"}
                  size="sm"
                  onClick={handleSuspend}
                  disabled={isSuspending}
                >
                  {isSuspending
                    ? "Processing..."
                    : user.suspended
                    ? "Unsuspend"
                    : "Suspend"}
                </Button>
                <p className="mt-2 text-xs text-gray-500">
                  {user.suspended
                    ? "Allow this user to log in again"
                    : "Prevent this user from logging in"}
                </p>
              </CardContent>
            </Card>

            {/* Reset Password */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={handleResetPassword}>
                  Send Reset Email
                </Button>
                <p className="mt-2 text-xs text-gray-500">
                  Send a password reset link to {user.email}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
