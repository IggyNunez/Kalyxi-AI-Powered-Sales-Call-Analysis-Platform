"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  RefreshCw,
  Settings,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SystemStatus {
  database: "healthy" | "degraded" | "down";
  api: "healthy" | "degraded" | "down";
  storage: "healthy" | "degraded" | "down";
  ai: "healthy" | "degraded" | "down";
}

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalCalls: number;
  callsToday: number;
  aiProcessingQueue: number;
  storageUsed: number;
  storageTotal: number;
}

export default function PlatformPage() {
  const { isSuperadmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for platform stats
  const [systemStatus] = useState<SystemStatus>({
    database: "healthy",
    api: "healthy",
    storage: "healthy",
    ai: "healthy",
  });

  const [stats] = useState<PlatformStats>({
    totalOrganizations: 12,
    totalUsers: 156,
    totalCalls: 4823,
    callsToday: 47,
    aiProcessingQueue: 3,
    storageUsed: 12.4,
    storageTotal: 100,
  });

  useEffect(() => {
    // Redirect non-superadmins
    if (!authLoading && !isSuperadmin) {
      router.push("/dashboard");
      return;
    }

    if (isSuperadmin) {
      // Simulate loading
      setTimeout(() => setLoading(false), 500);
    }
  }, [isSuperadmin, authLoading, router]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-emerald-500";
      case "degraded":
        return "text-amber-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge variant="success">Healthy</Badge>;
      case "degraded":
        return <Badge variant="warning">Degraded</Badge>;
      case "down":
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (authLoading || (!isSuperadmin && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-500" />
            Platform Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor system health and manage platform settings
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh Status
        </Button>
      </div>

      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                  systemStatus.database === "healthy" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  <Database className={cn("h-5 w-5", getStatusColor(systemStatus.database))} />
                </div>
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">Supabase PostgreSQL</p>
                </div>
              </div>
            </div>
            {getStatusBadge(systemStatus.database)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                  systemStatus.api === "healthy" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  <Server className={cn("h-5 w-5", getStatusColor(systemStatus.api))} />
                </div>
                <div>
                  <p className="font-medium">API</p>
                  <p className="text-xs text-muted-foreground">Next.js API Routes</p>
                </div>
              </div>
            </div>
            {getStatusBadge(systemStatus.api)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                  systemStatus.storage === "healthy" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  <HardDrive className={cn("h-5 w-5", getStatusColor(systemStatus.storage))} />
                </div>
                <div>
                  <p className="font-medium">Storage</p>
                  <p className="text-xs text-muted-foreground">Supabase Storage</p>
                </div>
              </div>
            </div>
            {getStatusBadge(systemStatus.storage)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                  systemStatus.ai === "healthy" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  <Zap className={cn("h-5 w-5", getStatusColor(systemStatus.ai))} />
                </div>
                <div>
                  <p className="font-medium">AI Engine</p>
                  <p className="text-xs text-muted-foreground">OpenAI GPT-4</p>
                </div>
              </div>
            </div>
            {getStatusBadge(systemStatus.ai)}
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Platform Statistics
            </CardTitle>
            <CardDescription>Overview of platform usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold">{stats.totalOrganizations}</p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold">{stats.totalCalls.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-3xl font-bold">{stats.callsToday}</p>
                <p className="text-sm text-muted-foreground">Calls Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Resource Usage
            </CardTitle>
            <CardDescription>Current resource consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">
                  {stats.storageUsed} GB / {stats.storageTotal} GB
                </span>
              </div>
              <Progress value={(stats.storageUsed / stats.storageTotal) * 100} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">AI Processing Queue</span>
                <span className="text-sm text-muted-foreground">
                  {stats.aiProcessingQueue} pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                {stats.aiProcessingQueue === 0 ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Queue Empty
                  </Badge>
                ) : stats.aiProcessingQueue < 10 ? (
                  <Badge variant="warning" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Processing
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    High Queue
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Database className="h-5 w-5" />
              <span>Database Backup</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <RefreshCw className="h-5 w-5" />
              <span>Clear Cache</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Activity className="h-5 w-5" />
              <span>View Logs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Shield className="h-5 w-5" />
              <span>Security Audit</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
