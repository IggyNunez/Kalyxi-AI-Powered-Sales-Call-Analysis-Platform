"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  BarChart3,
  Settings,
  Users,
  Upload,
  TrendingUp,
  FileText,
  LogOut,
  Webhook,
  Building,
  Shield,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { UserRole } from "@/types/database";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Calls", href: "/dashboard/calls", icon: Phone },
  {
    name: "Submit Call",
    href: "/dashboard/submit",
    icon: Upload,
    roles: ["admin", "superadmin"],
  },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Insights", href: "/dashboard/insights", icon: TrendingUp },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  {
    name: "Callers",
    href: "/dashboard/callers",
    icon: Users,
    roles: ["admin", "superadmin"],
  },
  {
    name: "Grading",
    href: "/dashboard/grading",
    icon: ClipboardCheck,
    roles: ["admin", "superadmin"],
  },
  {
    name: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Webhook,
    roles: ["admin", "superadmin"],
  },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNavigation: NavItem[] = [
  {
    name: "Organizations",
    href: "/admin/organizations",
    icon: Building,
    roles: ["superadmin"],
  },
  {
    name: "Platform",
    href: "/admin/platform",
    icon: Shield,
    roles: ["superadmin"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, organization, role, isAdmin, isSuperadmin, signOut } = useAuth();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  const filteredNavigation = navigation.filter(canSee);
  const filteredAdminNavigation = adminNavigation.filter(canSee);

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-indigo-950">
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute top-0 left-0 h-64 w-64 bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl" />

      {/* Logo */}
      <div className="relative flex h-16 items-center justify-center border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Kalyxi"
              width={24}
              height={24}
              className="object-contain brightness-0 invert"
            />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Kalyxi
          </span>
        </Link>
      </div>

      {/* Organization Info */}
      {organization && (
        <div className="relative mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600/10 to-transparent" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">
              Organization
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {organization.name}
            </p>
            {profile && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-[10px] font-bold text-white">
                  {profile.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-gray-300">{profile.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavigation.map((item, index) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "animate-fade-in-up",
                isActive
                  ? "bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 blur transition-opacity group-hover:opacity-30" />
              )}

              <item.icon className={cn(
                "relative h-5 w-5 transition-transform duration-200",
                isActive ? "text-white" : "text-gray-500 group-hover:text-purple-400",
                "group-hover:scale-110"
              )} />

              <span className="relative flex-1">{item.name}</span>

              {isActive && (
                <ChevronRight className="relative h-4 w-4 text-white/70" />
              )}
            </Link>
          );
        })}

        {/* Superadmin Section */}
        {isSuperadmin && filteredAdminNavigation.length > 0 && (
          <>
            <div className="my-4 border-t border-white/10" />
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-purple-400">
              Superadmin
            </p>
            {filteredAdminNavigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white shadow-lg shadow-amber-500/20"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-amber-400",
                    "group-hover:scale-110"
                  )} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-white/70" />
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Role Badge & Sign Out */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {isAdmin && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 px-3 py-2 border border-purple-500/20">
            <Shield className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold capitalize text-purple-300">
              {role}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group"
        >
          <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
