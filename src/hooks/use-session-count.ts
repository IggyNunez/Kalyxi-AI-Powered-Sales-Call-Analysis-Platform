"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";

interface SessionCounts {
  pending: number;
  inProgress: number;
  total: number;
}

interface UseSessionCountReturn {
  counts: SessionCounts;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSessionCount(): UseSessionCountReturn {
  const { user, role } = useAuth();
  const [counts, setCounts] = useState<SessionCounts>({
    pending: 0,
    inProgress: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // For coaches, fetch their sessions; for admins/managers, fetch all active sessions
      const isCoachOnly = role === "coach";
      const params = new URLSearchParams({
        status: "pending,in_progress",
        pageSize: "100",
        ...(isCoachOnly && { my_sessions: "true" }),
      });

      const response = await fetch(`/api/sessions?${params}`);

      if (!response.ok) {
        // Silent fail for non-critical feature
        console.warn("Failed to fetch session counts");
        return;
      }

      const data = await response.json();
      const sessions = data.data || [];

      const pending = sessions.filter(
        (s: { status: string }) => s.status === "pending"
      ).length;
      const inProgress = sessions.filter(
        (s: { status: string }) => s.status === "in_progress"
      ).length;

      setCounts({
        pending,
        inProgress,
        total: pending + inProgress,
      });
    } catch (err) {
      console.warn("Error fetching session counts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchCounts();

    // Refetch every 2 minutes to keep badge updated
    const interval = setInterval(fetchCounts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}
