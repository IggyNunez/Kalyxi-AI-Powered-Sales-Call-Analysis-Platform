"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, UserRole, Organization } from "@/types/database";
import { useRouter } from "next/navigation";
import { sanitizeUUID } from "@/lib/utils";

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: User | null;
  organization: Organization | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isCaller: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    // Sanitize userId to remove any potential :1 suffix from Supabase caching
    const sanitizedUserId = sanitizeUUID(userId);

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sanitizedUserId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return;
      }

      if (userProfile) {
        setProfile(userProfile as User);

        // Sanitize org_id as well
        const sanitizedOrgId = sanitizeUUID(userProfile.org_id);
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", sanitizedOrgId)
          .maybeSingle();

        if (orgError) {
          console.error("Error fetching organization:", orgError);
          return;
        }

        if (org) {
          setOrganization(org as Organization);
        }

        // Update last login
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", sanitizedUserId);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setUser(currentSession.user);
          setSession(currentSession);
          await fetchProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_IN" && newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setOrganization(null);
        router.push("/login");
      } else if (event === "TOKEN_REFRESHED") {
        // Session refreshed, no action needed
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setOrganization(null);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
      }

      // Force redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      // Force redirect even on error
      window.location.href = "/login";
    }
  };

  const role = profile?.role as UserRole | null;
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperadmin = role === "superadmin";
  const isCaller = role === "caller";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        role,
        isLoading,
        isAdmin,
        isSuperadmin,
        isCaller,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
