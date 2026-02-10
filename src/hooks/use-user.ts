"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User, UserRole, Organization } from "@/types/database";
import { sanitizeUUID } from "@/lib/utils";

interface UseUserReturn {
  user: SupabaseUser | null;
  profile: User | null;
  organization: Organization | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isCaller: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = useCallback(async (authUser: SupabaseUser) => {
    // Sanitize userId to remove any potential :1 suffix from Supabase caching
    const sanitizedUserId = sanitizeUUID(authUser.id);

    try {
      // Fetch user profile
      const { data: userProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", sanitizedUserId)
        .single();

      if (userProfile) {
        setProfile(userProfile as User);

        // Fetch organization (sanitize org_id as well)
        const sanitizedOrgId = sanitizeUUID(userProfile.org_id);
        const { data: org } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", sanitizedOrgId)
          .single();

        if (org) {
          setOrganization(org as Organization);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      setUser(authUser);
      await fetchUserData(authUser);
    }
  }, [supabase, fetchUserData]);

  useEffect(() => {
    const initUser = async () => {
      setIsLoading(true);

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          setUser(authUser);
          await fetchUserData(authUser);
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await fetchUserData(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setOrganization(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrganization(null);
  };

  const role = profile?.role as UserRole | null;
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperadmin = role === "superadmin";
  const isCaller = role === "caller";

  return {
    user,
    profile,
    organization,
    role,
    isLoading,
    isAdmin,
    isSuperadmin,
    isCaller,
    signOut,
    refreshUser,
  };
}
