"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";

export function AdvancedTab() {
  const { organization } = useAuth();
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhook/${organization?.slug || "your-org-slug"}`
    : "";

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRegenerateSecret = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/organizations/regenerate-webhook-secret", {
        method: "POST",
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error regenerating secret:", err);
    } finally {
      setRegenerating(false);
      setShowRegenerateDialog(false);
    }
  };

  const examplePayload = `{
  "caller_name": "John Doe",
  "caller_email": "john@example.com",
  "caller_team": "Sales Team A",
  "customer_name": "Jane Smith",
  "customer_company": "Acme Corp",
  "customer_phone": "+1-555-123-4567",
  "customer_email": "jane@acme.com",
  "raw_notes": "Full call transcript or notes go here...",
  "duration": 300,
  "external_id": "unique-call-id-123",
  "metadata": {
    "source": "your-crm",
    "campaign": "q1-outreach"
  }
}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="docs">API Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Send call data to this URL to automatically create and analyze calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm bg-muted/50" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, "url")}
                  >
                    {copied === "url" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook Secret</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={organization?.webhook_secret || ""}
                      readOnly
                      className="font-mono text-sm bg-muted/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(organization?.webhook_secret || "", "secret")}
                  >
                    {copied === "secret" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRegenerateDialog(true)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                <h4 className="font-medium text-amber-600 dark:text-amber-400">Security Notice</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep your webhook secret secure. All webhook requests should be signed using HMAC-SHA256.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Test</CardTitle>
              <CardDescription>Test your webhook integration using cURL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-gray-900 p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100">
                  <code>{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${organization?.webhook_secret || "YOUR_SECRET"}" \\
  -d '${JSON.stringify(JSON.parse(examplePayload), null, 2)}'`}</code>
                </pre>
              </div>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => copyToClipboard(
                  `curl -X POST ${webhookUrl} -H "Content-Type: application/json" -H "Authorization: Bearer ${organization?.webhook_secret || "YOUR_SECRET"}" -d '${examplePayload}'`,
                  "curl"
                )}
              >
                {copied === "curl" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy cURL Command
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>How to integrate with the Kalyxi webhook API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium">Endpoint</h4>
                <code className="mt-1 block rounded-lg bg-muted px-3 py-2 text-sm font-mono">
                  POST {webhookUrl}
                </code>
              </div>

              <div>
                <h4 className="font-medium">Authentication</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Include your webhook secret in the Authorization header:
                </p>
                <code className="mt-2 block rounded-lg bg-muted px-3 py-2 text-sm font-mono">
                  Authorization: Bearer YOUR_WEBHOOK_SECRET
                </code>
                <p className="mt-2 text-sm text-muted-foreground">
                  Or sign your request with HMAC-SHA256:
                </p>
                <code className="mt-2 block rounded-lg bg-muted px-3 py-2 text-sm font-mono">
                  X-Webhook-Signature: sha256=HMAC_SIGNATURE
                </code>
              </div>

              <div>
                <h4 className="font-medium">Request Body</h4>
                <div className="mt-2 rounded-xl bg-gray-900 p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100">
                    <code>{examplePayload}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Required Fields</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">caller_name</code> - Name of the sales rep</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">raw_notes</code> - Call transcript or notes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Optional Fields</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">caller_email</code> - Caller&apos;s email</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">caller_team</code> - Team/department name</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">customer_name</code> - Customer&apos;s name</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">customer_company</code> - Customer&apos;s company</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">duration</code> - Call duration in seconds</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">external_id</code> - Your unique call ID</li>
                  <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">metadata</code> - Additional custom data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Response</h4>
                <div className="mt-2 rounded-xl bg-gray-900 p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100">
                    <code>{`{
  "success": true,
  "call_id": "uuid-of-created-call",
  "message": "Call created and queued for analysis"
}`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Regenerate Secret Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Webhook Secret</DialogTitle>
            <DialogDescription>
              This will invalidate your current webhook secret. All existing integrations will need to be updated with the new secret.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRegenerateSecret} disabled={regenerating}>
              {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Regenerate Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
