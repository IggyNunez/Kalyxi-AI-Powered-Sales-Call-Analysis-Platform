"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, Settings, User, LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const router = useRouter();
  const { profile, organization, role, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Mock notifications - replace with real data later
  const notifications: { id: string; title: string; message: string; time: string; read: boolean }[] = [];

  const initials = profile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const getRoleBadgeVariant = () => {
    switch (role) {
      case "superadmin":
        return "gradient";
      case "admin":
        return "default";
      case "caller":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 transition-all duration-300">
      {/* Subtle gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className={cn(
          "relative transition-all duration-300",
          searchFocused ? "w-96" : "w-80"
        )}>
          <Search className={cn(
            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
            searchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            type="search"
            placeholder="Search calls, callers, reports..."
            className={cn(
              "pl-10 bg-muted/50 border-transparent",
              "focus:bg-background focus:border-primary/50",
              "transition-all duration-200"
            )}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* AI Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20">
          <div className="relative">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs font-medium text-emerald-600">AI Active</span>
        </div>

        {/* Notifications */}
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative rounded-xl hover:bg-primary/5 transition-all duration-200",
                showNotifications && "bg-primary/10"
              )}
            >
              <Bell className={cn(
                "h-5 w-5 transition-colors",
                showNotifications ? "text-primary" : "text-muted-foreground"
              )} />
              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/30 animate-bounce-subtle">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden animate-scale-in">
            <div className="bg-gradient-to-r from-primary/10 to-indigo-500/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:text-primary/80">
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="m-0" />
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-4 cursor-pointer border-b border-border/50 last:border-0",
                      !notification.read && "bg-primary/5"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground/70">{notification.time}</p>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-xl p-1.5 pr-3",
                "hover:bg-muted/50 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
              )}
            >
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-background shadow-md">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{profile?.name || "User"}</p>
                  {role && (
                    <Badge variant={getRoleBadgeVariant()} size="sm" className="capitalize">
                      {role}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {organization?.name || profile?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 animate-scale-in">
            <DropdownMenuLabel className="pb-0">
              <div className="flex flex-col">
                <span className="font-semibold">{profile?.name || "User"}</span>
                <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
