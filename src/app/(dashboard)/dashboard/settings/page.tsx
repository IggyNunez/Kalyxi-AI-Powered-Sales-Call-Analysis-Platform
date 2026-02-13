"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Save,
  User,
  Bell,
  Building,
  RefreshCw,
  Shield,
  CreditCard,
  Users,
  Check,
  Sparkles,
  Lock,
  Mail,
  Zap,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Star,
  Code,
  Database,
  AlertTriangle,
  Loader2,
  Link2,
  BookOpen,
  Target,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Script, ScriptSection } from "@/types/database";
import { ConnectionsTab } from "@/components/settings/ConnectionsTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { KnowledgeBaseTab } from "@/components/settings/KnowledgeBaseTab";
import { SkillsTab } from "@/components/settings/SkillsTab";
import { AdvancedTab } from "@/components/settings/AdvancedTab";

type SettingsTab =
  | "profile"
  | "connections"
  | "organization"
  | "team"
  | "knowledge-base"
  | "skills"
  | "scripts"
  | "security"
  | "notifications"
  | "advanced"
  | "billing"
  | "developer";

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
}

const settingsNav: SettingsNavItem[] = [
  { id: "profile", label: "Profile", icon: User, description: "Your personal information" },
  { id: "connections", label: "Connections", icon: Link2, description: "Google & integrations" },
  { id: "organization", label: "Organization", icon: Building, description: "Organization settings", adminOnly: true },
  { id: "team", label: "Team", icon: Users, description: "Manage team members", adminOnly: true },
  { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen, description: "AI context documents", adminOnly: true },
  { id: "skills", label: "Skills", icon: Target, description: "Skills taxonomy", adminOnly: true },
  { id: "scripts", label: "Scripts", icon: FileText, description: "Sales call scripts", adminOnly: true },
  { id: "security", label: "Security", icon: Shield, description: "Password & security" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email & push notifications" },
  { id: "advanced", label: "Advanced", icon: Settings2, description: "Webhooks & API", adminOnly: true },
  { id: "billing", label: "Billing", icon: CreditCard, description: "Subscription & payments", adminOnly: true },
  { id: "developer", label: "Demo Data", icon: Database, description: "Generate test data", adminOnly: true },
];

export default function SettingsPage() {
  const { profile, organization, isAdmin, refreshProfile } = useAuth();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as SettingsTab) || "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  const [orgSettings, setOrgSettings] = useState({
    name: "",
    settings: {
      features: {
        autoAnalyze: true,
        webhookEnabled: true,
      },
      notifications: {
        emailOnAnalysis: true,
        weeklySummary: false,
        analysisComplete: true,
      },
    },
  });

  // Scripts state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Demo data state
  const [demoDataStatus, setDemoDataStatus] = useState<{
    enabled: boolean;
    hasDemoData: boolean;
    counts: Record<string, number>;
  } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoGenerating, setDemoGenerating] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<{
    type: "success" | "error";
    message: string;
    counts?: Record<string, number>;
  } | null>(null);

  // Sync URL param with tab
  useEffect(() => {
    const tab = searchParams.get("tab") as SettingsTab | null;
    if (tab && settingsNav.some((n) => n.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || "",
        email: profile.email || "",
      });
    }
    if (organization) {
      const settings = organization.settings_json as unknown as Record<string, unknown> | null;
      setOrgSettings({
        name: organization.name,
        settings: {
          features: {
            autoAnalyze: (settings?.features as Record<string, boolean> | undefined)?.autoAnalyze ?? true,
            webhookEnabled: (settings?.features as Record<string, boolean> | undefined)?.webhookEnabled ?? true,
          },
          notifications: {
            emailOnAnalysis: (settings?.notifications as Record<string, boolean> | undefined)?.emailOnAnalysis ?? true,
            weeklySummary: (settings?.notifications as Record<string, boolean> | undefined)?.weeklySummary ?? false,
            analysisComplete: true,
          },
        },
      });
    }
  }, [profile, organization]);

  // Fetch scripts
  useEffect(() => {
    const fetchConfigData = async () => {
      if (!isAdmin) return;
      setLoadingData(true);
      try {
        const scriptsRes = await fetch("/api/scripts?pageSize=50");
        if (scriptsRes.ok) {
          const data = await scriptsRes.json();
          setScripts(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch configuration data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    if (activeTab === "scripts") {
      fetchConfigData();
    }
  }, [isAdmin, activeTab]);

  // Fetch demo data status
  useEffect(() => {
    const fetchDemoStatus = async () => {
      if (!isAdmin || activeTab !== "developer") return;
      setDemoLoading(true);
      try {
        const response = await fetch("/api/demo-data/status");
        if (response.ok) {
          const data = await response.json();
          setDemoDataStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch demo data status:", error);
      } finally {
        setDemoLoading(false);
      }
    };

    fetchDemoStatus();
  }, [isAdmin, activeTab]);

  // Demo data handlers
  const handleGenerateDemoData = async (size: "small" | "medium" | "stress") => {
    setDemoGenerating(size);
    setDemoResult(null);
    try {
      const response = await fetch("/api/demo-data/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        setDemoResult({
          type: "error",
          message: `Generation completed with ${data.errors.length} errors: ${data.errors[0]}`,
          counts: data.counts,
        });
      } else if (response.ok) {
        const totalCreated = Object.values(data.counts || {}).reduce((sum: number, count) => sum + (count as number), 0);
        if (totalCreated === 0) {
          setDemoResult({
            type: "error",
            message: "No data was created. Make sure the database migration (004_demo_data_tracking.sql) has been applied.",
            counts: data.counts,
          });
        } else {
          setDemoResult({
            type: "success",
            message: `Demo data generated successfully!`,
            counts: data.counts,
          });
        }
        const statusResponse = await fetch("/api/demo-data/status");
        if (statusResponse.ok) {
          setDemoDataStatus(await statusResponse.json());
        }
      } else {
        setDemoResult({
          type: "error",
          message: data.error || "Failed to generate demo data",
        });
      }
    } catch (error) {
      setDemoResult({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to generate demo data",
      });
    } finally {
      setDemoGenerating(null);
    }
  };

  const handleDeleteDemoData = async () => {
    if (!confirm("Are you sure you want to delete all demo data? This cannot be undone.")) return;
    setDemoGenerating("delete");
    setDemoResult(null);
    try {
      const response = await fetch("/api/demo-data/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setDemoResult({
          type: "success",
          message: `Deleted ${data.total} demo records`,
          counts: data.deleted,
        });
        const statusResponse = await fetch("/api/demo-data/status");
        if (statusResponse.ok) {
          setDemoDataStatus(await statusResponse.json());
        }
      } else {
        setDemoResult({
          type: "error",
          message: data.error || "Failed to delete demo data",
        });
      }
    } catch (error) {
      setDemoResult({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete demo data",
      });
    } finally {
      setDemoGenerating(null);
    }
  };

  // Script handlers
  const handleSetDefaultScript = async (id: string) => {
    try {
      const response = await fetch(`/api/scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true, status: "active" }),
      });
      if (response.ok) {
        setScripts((prev) =>
          prev.map((sc) => ({ ...sc, is_default: sc.id === id }))
        );
      }
    } catch (error) {
      console.error("Failed to set default script:", error);
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!confirm("Are you sure you want to delete this script?")) return;
    try {
      const response = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
      if (response.ok) {
        setScripts((prev) => prev.filter((sc) => sc.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete script:", error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileData.name }),
      });
      if (response.ok) {
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/organizations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings_json: orgSettings.settings }),
      });
      if (response.ok) {
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const initials = profile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";
  const filteredNav = settingsNav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and organization preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-1">
            {filteredNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                  activeTab === item.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and profile picture</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-2xl font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button type="button" variant="outline" size="sm">
                          Change Avatar
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 2MB.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="pl-10 bg-muted/50"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Contact support to change your email address</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
                          <Shield className="h-4 w-4 text-primary" />
                          <Badge variant={profile?.role === "superadmin" ? "gradient" : profile?.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {profile?.role || "caller"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Organization</Label>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{organization?.name || "Not assigned"}</span>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} variant="gradient" className="gap-2">
                      {saved ? <Check className="h-4 w-4 flex-shrink-0" /> : saving ? <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" /> : <Save className="h-4 w-4 flex-shrink-0" />}
                      <span>{saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Connections Tab */}
          {activeTab === "connections" && <ConnectionsTab />}

          {/* Organization Tab */}
          {activeTab === "organization" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                  <CardDescription>Manage your organization settings and features</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveOrgSettings} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="orgName" value={orgSettings.name} disabled className="pl-10 bg-muted/50" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Features
                      </h3>

                      <div className="space-y-4 pl-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-medium">Auto-Analyze Calls</p>
                            <p className="text-sm text-muted-foreground">Automatically analyze calls when uploaded or received via webhook</p>
                          </div>
                          <Switch
                            checked={orgSettings.settings.features.autoAnalyze}
                            onCheckedChange={(checked) =>
                              setOrgSettings((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, features: { ...prev.settings.features, autoAnalyze: checked } },
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-medium">Enable Webhooks</p>
                            <p className="text-sm text-muted-foreground">Allow external systems to send call data via webhook</p>
                          </div>
                          <Switch
                            checked={orgSettings.settings.features.webhookEnabled}
                            onCheckedChange={(checked) =>
                              setOrgSettings((prev) => ({
                                ...prev,
                                settings: { ...prev.settings, features: { ...prev.settings.features, webhookEnabled: checked } },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} variant="gradient" className="gap-2">
                      {saved ? <Check className="h-4 w-4 flex-shrink-0" /> : saving ? <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" /> : <Save className="h-4 w-4 flex-shrink-0" />}
                      <span>{saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && isAdmin && <TeamTab />}

          {/* Knowledge Base Tab */}
          {activeTab === "knowledge-base" && isAdmin && <KnowledgeBaseTab />}

          {/* Skills Tab */}
          {activeTab === "skills" && isAdmin && <SkillsTab />}

          {/* Billing Tab */}
          {activeTab === "billing" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-indigo-500/10 to-purple-500/10 p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <Badge variant="gradient">Pro Plan</Badge>
                      </div>
                      <h3 className="text-2xl font-bold">$49/month</h3>
                      <p className="text-sm text-muted-foreground mt-1">Unlimited calls, AI analysis, team features</p>
                    </div>
                    <Button variant="outline">Manage Plan</Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="text-sm text-muted-foreground">Calls This Month</p>
                      <p className="text-2xl font-bold mt-1">47</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="text-sm text-muted-foreground">Team Members</p>
                      <p className="text-2xl font-bold mt-1">5</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="text-sm text-muted-foreground">Next Billing</p>
                      <p className="text-2xl font-bold mt-1">Feb 15</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your payment information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-16 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white text-xs font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium">Visa ending in 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" placeholder="Enter current password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" placeholder="Enter new password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
                  </div>
                  <Button variant="gradient" className="gap-2">
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span>Update Password</span>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Currently disabled</p>
                      </div>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Choose what updates you receive via email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium">Analysis Complete</p>
                      <p className="text-sm text-muted-foreground">Get notified when call analysis is complete</p>
                    </div>
                    <Switch
                      checked={orgSettings.settings.notifications.analysisComplete}
                      onCheckedChange={(checked) =>
                        setOrgSettings((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, notifications: { ...prev.settings.notifications, analysisComplete: checked } },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium">Email Summaries</p>
                      <p className="text-sm text-muted-foreground">Receive email updates about your calls</p>
                    </div>
                    <Switch
                      checked={orgSettings.settings.notifications.emailOnAnalysis}
                      onCheckedChange={(checked) =>
                        setOrgSettings((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, notifications: { ...prev.settings.notifications, emailOnAnalysis: checked } },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium">Weekly Summary</p>
                      <p className="text-sm text-muted-foreground">Receive a weekly summary of your performance</p>
                    </div>
                    <Switch
                      checked={orgSettings.settings.notifications.weeklySummary}
                      onCheckedChange={(checked) =>
                        setOrgSettings((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, notifications: { ...prev.settings.notifications, weeklySummary: checked } },
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scripts Tab */}
          {activeTab === "scripts" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Sales Scripts
                    </CardTitle>
                    <CardDescription>Create and manage sales call scripts for your team</CardDescription>
                  </div>
                  <Button variant="gradient" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Script
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : scripts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No scripts created yet</p>
                      <p className="text-sm mt-1">Create sales scripts to guide your team</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scripts.map((script) => (
                        <div
                          key={script.id}
                          className={cn(
                            "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
                            script.is_default && script.status === "active" && "border-primary/50 bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{script.name}</h4>
                                {script.is_default && script.status === "active" && (
                                  <Badge variant="gradient" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Default
                                  </Badge>
                                )}
                                <Badge variant={script.status === "active" ? "default" : script.status === "draft" ? "secondary" : "outline"}>
                                  {script.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {script.description || "No description"}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{(script.sections as ScriptSection[])?.length || 0} sections</span>
                                <span>v{script.version}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!script.is_default && script.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefaultScript(script.id)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button variant="ghost" size="icon">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteScript(script.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Tab (Webhooks & API) */}
          {activeTab === "advanced" && isAdmin && <AdvancedTab />}

          {/* Developer / Demo Data Tab */}
          {activeTab === "developer" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Demo Data Generator
                  </CardTitle>
                  <CardDescription>
                    Generate realistic test data for development and demos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {demoLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !demoDataStatus?.enabled ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-600 dark:text-amber-400">Demo Data Disabled</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">DEMO_DATA_ENABLED=true</code> to enable.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {demoDataStatus?.hasDemoData && (
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Database className="h-4 w-4 text-primary" />
                              Current Demo Data
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive gap-2"
                              onClick={handleDeleteDemoData}
                              disabled={demoGenerating !== null}
                            >
                              {demoGenerating === "delete" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete All
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(demoDataStatus.counts || {}).map(([key, count]) => (
                              <div key={key} className="p-3 rounded-lg bg-background border">
                                <p className="text-2xl font-bold">{count}</p>
                                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {demoResult && (
                        <div className={cn(
                          "rounded-xl border p-4",
                          demoResult.type === "success" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                        )}>
                          <div className="flex items-start gap-3">
                            {demoResult.type === "success" ? (
                              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className={cn("font-medium", demoResult.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                {demoResult.message}
                              </p>
                              {demoResult.counts && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(demoResult.counts).map(([key, count]) => (
                                    <Badge key={key} variant="secondary" className="capitalize">{count} {key}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-4">Generate Demo Data</h4>
                        <div className="grid sm:grid-cols-3 gap-4">
                          {([
                            { size: "small" as const, label: "Small", calls: "~12 calls", desc: "3 callers, 4 each" },
                            { size: "medium" as const, label: "Medium", calls: "~60 calls", desc: "6 callers, 10 each" },
                            { size: "stress" as const, label: "Stress", calls: "~300 calls", desc: "10 callers, 30 each" },
                          ]).map((opt) => (
                            <button
                              key={opt.size}
                              type="button"
                              onClick={() => handleGenerateDemoData(opt.size)}
                              disabled={demoGenerating !== null}
                              className={cn(
                                "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all text-left group",
                                demoGenerating === opt.size && "ring-2 ring-primary"
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-lg font-bold">{opt.label}</span>
                                {demoGenerating === opt.size ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                  <Sparkles className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{opt.calls}</p>
                              <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code className="h-5 w-5 text-primary" />
                    CLI Commands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 font-mono text-sm">
                    {[
                      { cmd: "npm run demo:seed:small", desc: "# Small dataset" },
                      { cmd: "npm run demo:seed:medium", desc: "# Medium dataset" },
                      { cmd: "npm run demo:seed:stress", desc: "# Stress test" },
                      { cmd: "npm run demo:delete", desc: "# Delete all", destructive: true },
                    ].map((item) => (
                      <div key={item.cmd} className="p-3 rounded-lg bg-muted/50 border">
                        <code className={item.destructive ? "text-destructive" : "text-primary"}>{item.cmd}</code>
                        <span className="text-muted-foreground ml-2">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
