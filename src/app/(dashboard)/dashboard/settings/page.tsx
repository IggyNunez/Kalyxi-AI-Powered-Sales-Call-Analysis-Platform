"use client";

import { useEffect, useState } from "react";
import {
  Save,
  User,
  Bell,
  Key,
  Building,
  Webhook,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

export default function SettingsPage() {
  const { profile, organization, isAdmin, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
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
      },
    },
  });

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
          },
        },
      });
    }
  }, [profile, organization]);

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
        alert("Profile updated successfully!");
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
        alert("Organization settings updated!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhook/${organization?.slug}`;
    navigator.clipboard.writeText(url);
    alert("Webhook URL copied to clipboard!");
  };

  const handleCopyWebhookSecret = () => {
    if (organization?.webhook_secret) {
      navigator.clipboard.writeText(organization.webhook_secret);
      alert("Webhook secret copied to clipboard!");
    }
  };

  const handleRegenerateSecret = async () => {
    if (!confirm("Are you sure? This will invalidate the current webhook secret.")) return;

    try {
      const response = await fetch("/api/organizations/regenerate-secret", {
        method: "POST",
      });
      if (response.ok) {
        await refreshProfile();
        alert("New webhook secret generated!");
      }
    } catch (error) {
      console.error("Failed to regenerate secret:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account and organization preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="organization">
              <Building className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="webhook">
              <Webhook className="mr-2 h-4 w-4" />
              Webhook
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="api">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <Label>Role</Label>
                    <div className="mt-1">
                      <Badge variant={profile?.role === "superadmin" ? "default" : profile?.role === "admin" ? "secondary" : "outline"}>
                        {profile?.role || "caller"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Organization</Label>
                    <p className="mt-1 text-sm">{organization?.name || "Not assigned"}</p>
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage your organization settings and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrgSettings} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgSettings.name}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Features</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-Analyze Calls</p>
                        <p className="text-sm text-gray-500">
                          Automatically analyze calls when they are uploaded or received via webhook
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={orgSettings.settings.features.autoAnalyze}
                        onChange={(e) =>
                          setOrgSettings((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              features: { ...prev.settings.features, autoAnalyze: e.target.checked },
                            },
                          }))
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Webhooks</p>
                        <p className="text-sm text-gray-500">
                          Allow external systems to send call data via webhook
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={orgSettings.settings.features.webhookEnabled}
                        onChange={(e) =>
                          setOrgSettings((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              features: { ...prev.settings.features, webhookEnabled: e.target.checked },
                            },
                          }))
                        }
                        className="h-4 w-4"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure webhooks to receive call data from external systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/${organization?.slug || ''}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button type="button" variant="outline" onClick={handleCopyWebhookUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Send POST requests to this URL to create new calls
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showWebhookSecret ? "text" : "password"}
                      value={organization?.webhook_secret || ""}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCopyWebhookSecret}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use this secret to sign webhook requests or as a Bearer token
                  </p>
                </div>

                <Button type="button" variant="outline" onClick={handleRegenerateSecret}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Secret
                </Button>

                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-medium mb-2">Authentication Methods</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      <strong>Bearer Token:</strong> Add header{" "}
                      <code className="bg-gray-200 px-1 rounded">Authorization: Bearer YOUR_SECRET</code>
                    </li>
                    <li>
                      <strong>Signature:</strong> Add header{" "}
                      <code className="bg-gray-200 px-1 rounded">x-webhook-signature: HMAC_SHA256</code>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-medium mb-2">Example Payload</h4>
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`{
  "caller_email": "john@company.com",
  "caller_name": "John Doe",
  "raw_notes": "Call transcript or notes...",
  "customer_name": "Jane Smith",
  "customer_company": "Acme Corp",
  "customer_email": "jane@acme.com",
  "duration": 1800,
  "call_timestamp": "2024-01-15T10:30:00Z",
  "external_id": "unique-call-id"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">
                      Receive email updates about your calls
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgSettings.settings.notifications.emailOnAnalysis}
                    onChange={(e) =>
                      setOrgSettings((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          notifications: { ...prev.settings.notifications, emailOnAnalysis: e.target.checked },
                        },
                      }))
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Analysis Complete</p>
                    <p className="text-sm text-gray-500">
                      Get notified when call analysis is complete
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-gray-500">
                      Receive a weekly summary of your performance
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgSettings.settings.notifications.weeklySummary}
                    onChange={(e) =>
                      setOrgSettings((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          notifications: { ...prev.settings.notifications, weeklySummary: e.target.checked },
                        },
                      }))
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure API keys for call analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="openaiKey">OpenAI API Key</Label>
                    <Input
                      id="openaiKey"
                      type="password"
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-gray-500">
                      Your API key is stored securely and used for call analysis.
                      If not set, the platform default key will be used.
                    </p>
                  </div>

                  <Button>Save API Key</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Access the Kalyxi API programmatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-gray-50 p-4">
                  <h4 className="font-medium mb-2">API Endpoints</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>
                      <code className="bg-gray-200 px-1 rounded">GET /api/calls</code>
                      <span className="ml-2">List all calls</span>
                    </li>
                    <li>
                      <code className="bg-gray-200 px-1 rounded">GET /api/calls/:id</code>
                      <span className="ml-2">Get call details</span>
                    </li>
                    <li>
                      <code className="bg-gray-200 px-1 rounded">POST /api/calls</code>
                      <span className="ml-2">Create a new call</span>
                    </li>
                    <li>
                      <code className="bg-gray-200 px-1 rounded">POST /api/calls/:id/analyze</code>
                      <span className="ml-2">Trigger analysis</span>
                    </li>
                    <li>
                      <code className="bg-gray-200 px-1 rounded">GET /api/callers</code>
                      <span className="ml-2">List all callers</span>
                    </li>
                    <li>
                      <code className="bg-gray-200 px-1 rounded">GET /api/dashboard/stats</code>
                      <span className="ml-2">Get dashboard statistics</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
