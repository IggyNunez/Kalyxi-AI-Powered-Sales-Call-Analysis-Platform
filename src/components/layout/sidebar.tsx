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
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { UserRole } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    name: "Scorecard",
    href: "/dashboard/scorecard",
    icon: ClipboardList,
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

function NavLink({
  item,
  isActive,
  isCollapsed,
  index,
  variant = "default",
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  index: number;
  variant?: "default" | "admin";
}) {
  const { closeMobile } = useSidebar();

  const activeGradient =
    variant === "admin"
      ? "from-amber-500/80 to-orange-500/80 shadow-amber-500/20"
      : "from-purple-600/80 to-indigo-600/80 shadow-purple-500/20";

  const iconHoverColor =
    variant === "admin" ? "group-hover:text-amber-400" : "group-hover:text-purple-400";

  const content = (
    <Link
      href={item.href}
      onClick={closeMobile}
      className={cn(
        "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
        isCollapsed ? "justify-center px-2" : "gap-3 px-3",
        !isCollapsed && "animate-fade-in-up",
        isActive
          ? `bg-gradient-to-r ${activeGradient} text-white shadow-lg`
          : "text-gray-400 hover:text-gray-200"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >

      <item.icon
        className={cn(
          "relative h-5 w-5 flex-shrink-0 transition-all duration-200",
          isActive ? "text-white" : `text-gray-500 ${iconHoverColor}`,
          "group-hover:scale-110"
        )}
      />

      {!isCollapsed && (
        <>
          <span className="relative flex-1 truncate">{item.name}</span>
          {isActive && <ChevronRight className="relative h-4 w-4 text-white/70" />}
        </>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, organization, role, isAdmin, isSuperadmin, signOut } = useAuth();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  const filteredNavigation = navigation.filter(canSee);
  const filteredAdminNavigation = adminNavigation.filter(canSee);

  return (
    <TooltipProvider>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-indigo-950 transition-all duration-300 ease-in-out lg:relative",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute top-0 left-0 h-64 w-64 bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl" />

        {/* Logo */}
        <div className="relative flex h-16 items-center border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            className="flex items-center group flex-1"
            onClick={closeMobile}
          >
            {isCollapsed ? (
              <Image
                src="/logo-small.png"
                alt="Kalyxi"
                width={32}
                height={32}
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                priority
              />
            ) : (
              <Image
                src="/logo-white.png"
                alt="Kalyxi"
                width={130}
                height={40}
                className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                priority
              />
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center",
              "rounded-full bg-gray-800 border border-white/10 text-gray-400",
              "hover:bg-gray-700 hover:text-white transition-all duration-200",
              "shadow-lg hover:shadow-xl"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Organization Info */}
        {organization && !isCollapsed && (
          <div className="relative mx-3 mt-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm animate-fade-in">
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

        {/* Collapsed Organization Avatar */}
        {organization && isCollapsed && (
          <div className="flex justify-center mt-4">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-purple-500/20">
                  {organization.name.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-semibold">{organization.name}</p>
                  {profile && <p className="text-xs text-muted-foreground">{profile.name}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Main Navigation */}
        <nav className={cn("flex-1 space-y-1 overflow-y-auto scrollbar-hidden py-4", isCollapsed ? "px-2" : "px-3")}>
          {filteredNavigation.map((item, index) => {
            // Dashboard should only match exact path, other routes can match sub-routes
            const isActive = item.href === "/dashboard"
              ? pathname === item.href
              : (pathname === item.href || pathname.startsWith(item.href + "/"));
            return (
              <NavLink
                key={item.name}
                item={item}
                isActive={isActive}
                isCollapsed={isCollapsed}
                index={index}
              />
            );
          })}

          {/* Superadmin Section */}
          {isSuperadmin && filteredAdminNavigation.length > 0 && (
            <>
              <div className="my-4 border-t border-white/10" />
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-purple-400">
                  Superadmin
                </p>
              )}
              {filteredAdminNavigation.map((item, index) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <NavLink
                    key={item.name}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    index={index}
                    variant="admin"
                  />
                );
              })}
            </>
          )}
        </nav>

        {/* Role Badge & Sign Out */}
        <div className={cn("border-t border-white/10 p-3 space-y-2", isCollapsed && "px-2")}>
          {isAdmin && !isCollapsed && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 px-3 py-2 border border-purple-500/20">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-semibold capitalize text-purple-300">{role}</span>
            </div>
          )}

          {isAdmin && isCollapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 p-2 border border-purple-500/20">
                  <Shield className="h-4 w-4 text-purple-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="capitalize">{role}</span>
              </TooltipContent>
            </Tooltip>
          )}

          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => signOut()}
                  aria-label="Sign out"
                  className="flex w-full items-center justify-center rounded-xl p-2.5 text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
