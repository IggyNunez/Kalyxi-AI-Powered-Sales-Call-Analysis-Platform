"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
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
}

const navigation: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "My Templates", href: "/dashboard/templates", icon: ClipboardList },
];

function NavIcon({
  item,
  isActive,
  isMobile,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isMobile: boolean;
  onClick?: () => void;
}) {
  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-center rounded-xl p-2.5 transition-all duration-200",
        isMobile && "gap-3 px-3 justify-start",
        isActive
          ? "bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-500/20"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-all duration-200",
          isActive ? "text-white" : "text-gray-500 group-hover:text-purple-400",
          "group-hover:scale-110"
        )}
      />
      {isMobile && <span className="text-sm font-medium">{item.name}</span>}
    </Link>
  );

  if (isMobile) return content;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {item.name}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, organization, role, isAdmin, signOut } = useAuth();
  const { isMobileOpen, closeMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          "lg:w-16",
          isMobileOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute top-0 left-0 h-64 w-64 bg-gradient-to-br from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl" />

        {/* Logo */}
        <div className="relative flex h-16 items-center justify-center border-b border-white/10 px-2">
          <Link
            href="/dashboard"
            className="flex items-center group"
            onClick={closeMobile}
          >
            {isMobileOpen ? (
              <Image
                src="/logo-white.png"
                alt="Kalyxi"
                width={130}
                height={40}
                className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                priority
              />
            ) : (
              <Image
                src="/logo-small.png"
                alt="Kalyxi"
                width={32}
                height={32}
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                priority
              />
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="lg:hidden absolute right-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Organization Avatar */}
        {organization && (
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
                  {profile && (
                    <p className="text-xs text-muted-foreground">
                      {profile.name}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Mobile Org Info */}
        {organization && isMobileOpen && (
          <div className="lg:hidden mx-3 mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">
              Organization
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {organization.name}
            </p>
          </div>
        )}

        {/* Create Template Button */}
        <div className="flex justify-center mt-4 px-2">
          {isMobileOpen ? (
            <Link
              href="/dashboard/templates/new"
              onClick={closeMobile}
              className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              Create Template
            </Link>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/templates/new"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Create Template
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hidden py-4 px-2">
          {navigation.map((item) => {
            const isActive =
              mounted &&
              (item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/"));
            return (
              <NavIcon
                key={item.name}
                item={item}
                isActive={isActive}
                isMobile={isMobileOpen}
                onClick={isMobileOpen ? closeMobile : undefined}
              />
            );
          })}
        </nav>

        {/* Bottom Section: Settings, Role Badge, Sign Out */}
        <div className="border-t border-white/10 p-2 space-y-1">
          {/* Settings */}
          <NavIcon
            item={{
              name: "Settings",
              href: "/dashboard/settings",
              icon: Settings,
            }}
            isActive={
              mounted &&
              (pathname === "/dashboard/settings" ||
                pathname.startsWith("/dashboard/settings/"))
            }
            isMobile={isMobileOpen}
            onClick={isMobileOpen ? closeMobile : undefined}
          />

          {/* Role Badge */}
          {isAdmin && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 p-2 border border-purple-500/20">
                  <Shield className="h-4 w-4 text-purple-400" />
                  {isMobileOpen && (
                    <span className="ml-2 text-xs font-semibold capitalize text-purple-300">
                      {role}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              {!isMobileOpen && (
                <TooltipContent side="right">
                  <span className="capitalize">{role}</span>
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Sign Out */}
          {isMobileOpen ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                signOut();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              Sign Out
            </button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    signOut();
                  }}
                  aria-label="Sign out"
                  className="flex w-full items-center justify-center rounded-xl p-2.5 text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
