"use client";

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserAnalytics, TeamAnalyticsPagination } from "@/types/analytics";

interface TeamAnalyticsTableProps {
  users: UserAnalytics[];
  sortBy: keyof UserAnalytics;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof UserAnalytics) => void;
  onUserClick: (user: UserAnalytics) => void;
  pagination: TeamAnalyticsPagination;
  onPageChange: (page: number) => void;
}

export function TeamAnalyticsTable({
  users,
  sortBy,
  sortOrder,
  onSort,
  onUserClick,
  pagination,
  onPageChange,
}: TeamAnalyticsTableProps) {
  const SortIcon = ({ field }: { field: keyof UserAnalytics }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  const SortableHeader = ({
    field,
    children,
    className = "",
  }: {
    field: keyof UserAnalytics;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-white ${className}`}
      onClick={() => onSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </th>
  );

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800 bg-gray-900/80">
              <tr>
                <SortableHeader field="name" className="min-w-[200px]">
                  User
                </SortableHeader>
                <SortableHeader field="role">Role</SortableHeader>
                <SortableHeader field="totalSessions">Sessions</SortableHeader>
                <SortableHeader field="averageScore">Avg Score</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Pass Rate
                </th>
                <SortableHeader field="totalCalls">Calls</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer transition-colors hover:bg-gray-800/50"
                  onClick={() => onUserClick(user)}
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gray-700 text-gray-200">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Badge className={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-white">{user.totalSessions}</div>
                    <div className="text-xs text-gray-500">
                      {user.completedSessions} completed
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`font-medium ${getScoreColor(user.averageScore)}`}>
                      {user.averageScore !== null
                        ? `${user.averageScore.toFixed(1)}%`
                        : "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`font-medium ${getScoreColor(user.passRate)}`}>
                      {user.passRate !== null
                        ? `${user.passRate.toFixed(0)}%`
                        : "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="text-white">{user.totalCalls}</div>
                    <div className="text-xs text-gray-500">
                      {user.analyzedCalls} analyzed
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {user.suspended ? (
                      <Badge className="bg-red-500/20 text-red-300">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-300">
                        Active
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {users.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400">No users found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
