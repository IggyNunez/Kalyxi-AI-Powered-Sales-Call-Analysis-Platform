"use client";

import { useEffect, useState } from "react";
import {
  Save,
  User,
  Bell,
  Key,
  Building,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  CreditCard,
  Users,
  Check,
  Sparkles,
  Lock,
  Mail,
  Zap,
  ClipboardList,
  FileText,
  Lightbulb,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  MoreHorizontal,
  Archive,
  Play,
  Star,
  Code,
  Database,
  AlertTriangle,
  Loader2,
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
import { Scorecard, Script, InsightTemplate, ScorecardCriterion, ScriptSection } from "@/types/database";

type SettingsTab = "profile" | "organization" | "billing" | "team" | "scorecard" | "scripts" | "insights" | "security" | "notifications" | "api" | "developer";

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
}

const settingsNav: SettingsNavItem[] = [
  { id: "profile", label: "Profile", icon: User, description: "Your personal information" },
  { id: "organization", label: "Organization", icon: Building, description: "Organization settings", adminOnly: true },
  { id: "billing", label: "Billing", icon: CreditCard, description: "Subscription & payments", adminOnly: true },
  { id: "team", label: "Team", icon: Users, description: "Manage team members", adminOnly: true },
  { id: "scorecard", label: "Scorecard", icon: ClipboardList, description: "Call grading criteria", adminOnly: true },
  { id: "scripts", label: "Scripts", icon: FileText, description: "Sales call scripts", adminOnly: true },
  { id: "insights", label: "Insight Templates", icon: Lightbulb, description: "AI insight configuration", adminOnly: true },
  { id: "security", label: "Security", icon: Shield, description: "Password & security" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email & push notifications" },
  { id: "api", label: "API & Webhooks", icon: Key, description: "Developer settings", adminOnly: true },
  { id: "developer", label: "Demo Data", icon: Database, description: "Generate test data", adminOnly: true },
];

export default function SettingsPage() {
  const { profile, organization, isAdmin, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
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

  // New state for scorecards, scripts, and insight templates
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [insightTemplates, setInsightTemplates] = useState<InsightTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [editingScorecard, setEditingScorecard] = useState<Scorecard | null>(null);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editingInsight, setEditingInsight] = useState<InsightTemplate | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);

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

  // Fetch scorecards, scripts, and insight templates
  useEffect(() => {
    const fetchConfigData = async () => {
      if (!isAdmin) return;
      setLoadingData(true);
      try {
        const [scorecardsRes, scriptsRes, insightsRes] = await Promise.all([
          fetch("/api/scorecards?pageSize=50"),
          fetch("/api/scripts?pageSize=50"),
          fetch("/api/insight-templates?pageSize=50"),
        ]);

        if (scorecardsRes.ok) {
          const data = await scorecardsRes.json();
          setScorecards(data.data || []);
        }
        if (scriptsRes.ok) {
          const data = await scriptsRes.json();
          setScripts(data.data || []);
        }
        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setInsightTemplates(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch configuration data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    if (activeTab === "scorecard" || activeTab === "scripts" || activeTab === "insights") {
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

      // Check for errors in response (207 status also passes response.ok)
      if (data.errors && data.errors.length > 0) {
        setDemoResult({
          type: "error",
          message: `Generation completed with ${data.errors.length} errors: ${data.errors[0]}`,
          counts: data.counts,
        });
      } else if (response.ok) {
        // Check if any data was actually created
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
        // Refresh status
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
        // Refresh status
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

  // Scorecard CRUD handlers
  const handleSetDefaultScorecard = async (id: string) => {
    try {
      const response = await fetch(`/api/scorecards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true, status: "active" }),
      });
      if (response.ok) {
        setScorecards((prev) =>
          prev.map((sc) => ({ ...sc, is_default: sc.id === id }))
        );
      }
    } catch (error) {
      console.error("Failed to set default scorecard:", error);
    }
  };

  const handleDeleteScorecard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scorecard?")) return;
    try {
      const response = await fetch(`/api/scorecards/${id}`, { method: "DELETE" });
      if (response.ok) {
        setScorecards((prev) => prev.filter((sc) => sc.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete scorecard:", error);
    }
  };

  // Script CRUD handlers
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

  // Insight Template CRUD handlers
  const handleToggleInsightActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/insight-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (response.ok) {
        setInsightTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_active: isActive } : t))
        );
      }
    } catch (error) {
      console.error("Failed to toggle insight template:", error);
    }
  };

  const handleDeleteInsightTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this insight template?")) return;
    try {
      const response = await fetch(`/api/insight-templates/${id}`, { method: "DELETE" });
      if (response.ok) {
        setInsightTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete insight template:", error);
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Could use toast here
  };

  const handleRegenerateSecret = async () => {
    if (!confirm("Are you sure? This will invalidate the current webhook secret.")) return;
    try {
      const response = await fetch("/api/organizations/regenerate-secret", { method: "POST" });
      if (response.ok) {
        await refreshProfile();
      }
    } catch (error) {
      console.error("Failed to regenerate secret:", error);
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
                onClick={() => setActiveTab(item.id)}
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
                    {/* Avatar Section */}
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

                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Email */}
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

                    {/* Role & Organization */}
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

          {/* Team Tab */}
          {activeTab === "team" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to your organization</CardDescription>
                  </div>
                  <Button variant="gradient" className="gap-2">
                    <Users className="h-4 w-4" />
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: profile?.name || "You", email: profile?.email, role: profile?.role || "admin", avatar: null },
                    ].map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white text-sm">
                              {member.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={member.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {member.role}
                          </Badge>
                          {index > 0 && <Button variant="ghost" size="sm">Remove</Button>}
                        </div>
                      </div>
                    ))}
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

          {/* API & Webhooks Tab */}
          {activeTab === "api" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>Configure webhooks to receive call data from external systems</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/${organization?.slug || ""}`}
                        readOnly
                        className="font-mono text-sm bg-muted/50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(`${window.location.origin}/api/webhook/${organization?.slug}`, "Webhook URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showWebhookSecret ? "text" : "password"}
                        value={organization?.webhook_secret || ""}
                        readOnly
                        className="font-mono text-sm bg-muted/50"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowWebhookSecret(!showWebhookSecret)}>
                        {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(organization?.webhook_secret || "", "Secret")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button type="button" variant="outline" onClick={handleRegenerateSecret} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Regenerate Secret
                  </Button>

                  <div className="rounded-xl bg-muted/30 border p-4 space-y-3">
                    <h4 className="font-medium">Authentication Methods</h4>
                    <div className="text-sm space-y-2 text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Bearer Token:</strong> Add header{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization: Bearer YOUR_SECRET</code>
                      </p>
                      <p>
                        <strong className="text-foreground">Signature:</strong> Add header{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-webhook-signature: HMAC_SHA256</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>OpenAI API Key</CardTitle>
                  <CardDescription>Provide your own API key for call analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="openaiKey">API Key</Label>
                    <Input id="openaiKey" type="password" placeholder="sk-..." />
                    <p className="text-xs text-muted-foreground">Your API key is stored securely. If not set, the platform default key will be used.</p>
                  </div>
                  <Button variant="gradient" className="gap-2">
                    <Save className="h-4 w-4 flex-shrink-0" />
                    <span>Save API Key</span>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>Available API endpoints for integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { method: "GET", path: "/api/calls", desc: "List all calls" },
                      { method: "GET", path: "/api/calls/:id", desc: "Get call details" },
                      { method: "POST", path: "/api/calls", desc: "Create a new call" },
                      { method: "POST", path: "/api/calls/:id/analyze", desc: "Trigger analysis" },
                      { method: "GET", path: "/api/callers", desc: "List all callers" },
                      { method: "GET", path: "/api/dashboard/stats", desc: "Get dashboard statistics" },
                    ].map((endpoint, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <Badge variant={endpoint.method === "GET" ? "secondary" : "default"} className="font-mono text-xs w-16 justify-center">
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                        <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scorecard Tab */}
          {activeTab === "scorecard" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      Scorecards
                    </CardTitle>
                    <CardDescription>Define grading criteria for evaluating sales calls</CardDescription>
                  </div>
                  <Button variant="gradient" className="gap-2" onClick={() => setShowScorecardModal(true)}>
                    <Plus className="h-4 w-4" />
                    New Scorecard
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : scorecards.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No scorecards created yet</p>
                      <p className="text-sm mt-1">Create your first scorecard to start grading calls</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scorecards.map((scorecard) => (
                        <div
                          key={scorecard.id}
                          className={cn(
                            "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
                            scorecard.is_default && scorecard.status === "active" && "border-primary/50 bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{scorecard.name}</h4>
                                {scorecard.is_default && scorecard.status === "active" && (
                                  <Badge variant="gradient" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Default
                                  </Badge>
                                )}
                                <Badge variant={scorecard.status === "active" ? "default" : scorecard.status === "draft" ? "secondary" : "outline"}>
                                  {scorecard.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {scorecard.description || "No description"}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{(scorecard.criteria as ScorecardCriterion[])?.length || 0} criteria</span>
                                <span>v{scorecard.version}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!scorecard.is_default && scorecard.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefaultScorecard(scorecard.id)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingScorecard(scorecard);
                                  setShowScorecardModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteScorecard(scorecard.id)}
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

              {/* Scorecard Info Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-indigo-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">How Scorecards Work</h4>
                      <p className="text-sm text-muted-foreground">
                        Scorecards define the criteria used to evaluate sales calls. Each criterion has a weight that determines its importance in the final score. The AI analyzes calls against the active default scorecard and provides detailed feedback for each criterion.
                      </p>
                    </div>
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
                  <Button variant="gradient" className="gap-2" onClick={() => setShowScriptModal(true)}>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingScript(script);
                                  setShowScriptModal(true);
                                }}
                              >
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

          {/* Insight Templates Tab */}
          {activeTab === "insights" && isAdmin && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Insight Templates
                    </CardTitle>
                    <CardDescription>Configure AI-generated insights for call analysis</CardDescription>
                  </div>
                  <Button variant="gradient" className="gap-2" onClick={() => setShowInsightModal(true)}>
                    <Plus className="h-4 w-4" />
                    New Template
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : insightTemplates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No insight templates created yet</p>
                      <p className="text-sm mt-1">Create templates to customize AI-generated insights</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {insightTemplates.map((template) => (
                        <div
                          key={template.id}
                          className={cn(
                            "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
                            !template.is_active && "opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{template.name}</h4>
                                {template.is_default && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Default
                                  </Badge>
                                )}
                                <Badge variant="outline" className="capitalize">
                                  {template.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {template.description || "No description"}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Format: {template.output_format}</span>
                                <span>Max insights: {template.max_insights}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={template.is_active}
                                onCheckedChange={(checked) => handleToggleInsightActive(template.id, checked)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingInsight(template);
                                  setShowInsightModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              {!template.is_default && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteInsightTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categories Legend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insight Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { name: "General", desc: "Overall call observations", color: "bg-gray-500" },
                      { name: "Coaching", desc: "Training recommendations", color: "bg-blue-500" },
                      { name: "Performance", desc: "Metrics and benchmarks", color: "bg-green-500" },
                      { name: "Compliance", desc: "Regulatory adherence", color: "bg-amber-500" },
                      { name: "Custom", desc: "User-defined insights", color: "bg-purple-500" },
                    ].map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className={cn("h-3 w-3 rounded-full", cat.color)} />
                        <div>
                          <p className="font-medium text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                    Generate realistic test data for development and demos. All demo data can be cleanly removed without affecting production records.
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
                            Demo data generation is currently disabled. To enable it, set the environment variable:
                          </p>
                          <code className="block mt-3 px-3 py-2 rounded-lg bg-muted font-mono text-sm">
                            DEMO_DATA_ENABLED=true
                          </code>
                          <p className="text-xs text-muted-foreground mt-3">
                            This is a security measure to prevent accidental data generation in production.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Current Status */}
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
                              Delete All Demo Data
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

                      {/* Result Message */}
                      {demoResult && (
                        <div
                          className={cn(
                            "rounded-xl border p-4",
                            demoResult.type === "success"
                              ? "border-green-500/30 bg-green-500/5"
                              : "border-red-500/30 bg-red-500/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {demoResult.type === "success" ? (
                              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className={cn(
                                "font-medium",
                                demoResult.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {demoResult.message}
                              </p>
                              {demoResult.counts && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {Object.entries(demoResult.counts).map(([key, count]) => (
                                    <Badge key={key} variant="secondary" className="capitalize">
                                      {count} {key}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Generate Options */}
                      <div>
                        <h4 className="font-semibold mb-4">Generate Demo Data</h4>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <button
                            type="button"
                            onClick={() => handleGenerateDemoData("small")}
                            disabled={demoGenerating !== null}
                            className={cn(
                              "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all text-left group",
                              demoGenerating === "small" && "ring-2 ring-primary"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold">Small</span>
                              {demoGenerating === "small" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">~12 calls</p>
                            <p className="text-xs text-muted-foreground mt-1">3 callers, 4 calls each</p>
                            <p className="text-xs text-muted-foreground">Best for quick demos</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateDemoData("medium")}
                            disabled={demoGenerating !== null}
                            className={cn(
                              "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all text-left group",
                              demoGenerating === "medium" && "ring-2 ring-primary"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold">Medium</span>
                              {demoGenerating === "medium" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">~60 calls</p>
                            <p className="text-xs text-muted-foreground mt-1">6 callers, 10 calls each</p>
                            <p className="text-xs text-muted-foreground">Good for realistic testing</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateDemoData("stress")}
                            disabled={demoGenerating !== null}
                            className={cn(
                              "p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all text-left group",
                              demoGenerating === "stress" && "ring-2 ring-primary"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg font-bold">Stress</span>
                              {demoGenerating === "stress" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">~300 calls</p>
                            <p className="text-xs text-muted-foreground mt-1">10 callers, 30 calls each</p>
                            <p className="text-xs text-muted-foreground">For performance testing</p>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* CLI Commands Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code className="h-5 w-5 text-primary" />
                    CLI Commands
                  </CardTitle>
                  <CardDescription>
                    You can also generate demo data using command line scripts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <code className="text-primary">npm run demo:seed:small</code>
                      <span className="text-muted-foreground ml-2"># Generate small dataset</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <code className="text-primary">npm run demo:seed:medium</code>
                      <span className="text-muted-foreground ml-2"># Generate medium dataset</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <code className="text-primary">npm run demo:seed:stress</code>
                      <span className="text-muted-foreground ml-2"># Generate stress test dataset</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <code className="text-destructive">npm run demo:delete</code>
                      <span className="text-muted-foreground ml-2"># Delete all demo data</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card className="bg-gradient-to-br from-primary/5 to-indigo-500/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">How Demo Data Works</h4>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Demo data is tagged with a unique batch ID for easy cleanup</li>
                        <li>• All demo records are scoped to your organization only</li>
                        <li>• Includes realistic callers, calls, analyses, reports, and more</li>
                        <li>• Contains edge cases: perfect scores, zero scores, long transcripts</li>
                        <li>• Safe to use alongside production data - delete only removes demo records</li>
                      </ul>
                    </div>
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
