"use client";

import { useState, useEffect } from "react";
import {
  Webhook,
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
  ExternalLink,
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

interface WebhookLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  processing_time_ms: number;
  created_at: string;
  error_message?: string;
}

export default function WebhooksPage() {
  const { organization } = useAuth();
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhook/${organization?.slug || "your-org-slug"}`
    : "";

  useEffect(() => {
    // Mock logs for now - will be replaced with real API call
    setLogs([]);
    setLoadingLogs(false);
  }, []);

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
      // API call to regenerate webhook secret
      const res = await fetch("/api/organizations/regenerate-webhook-secret", {
        method: "POST",
      });
      if (res.ok) {
        // Refresh page to get new secret
        window.location.reload();
      }
    } catch (err) {
      console.error("Error regenerating secret:", err);
    } finally {
      setRegenerating(false);
      setShowRegenerateDialog(false);
    }
  };

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (statusCode >= 400) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-100 text-green-700">{statusCode}</Badge>;
    }
    if (statusCode >= 400) {
      return <Badge className="bg-red-100 text-red-700">{statusCode}</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700">{statusCode}</Badge>;
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
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-gray-500">
          Configure webhook integration for automatic call ingestion
        </p>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-indigo-600" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Send call data to this URL to automatically create and analyze calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
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
                      value={organization?.webhook_secret || "••••••••••••••••"}
                      readOnly
                      className="font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Use this secret to sign your webhook requests with HMAC-SHA256
                </p>
              </div>

              <div className="rounded-lg border bg-amber-50 p-4">
                <h4 className="font-medium text-amber-800">Security Notice</h4>
                <p className="mt-1 text-sm text-amber-700">
                  Keep your webhook secret secure. Never expose it in client-side code or public repositories.
                  All webhook requests should be signed using HMAC-SHA256 with this secret.
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
              <div className="rounded-lg bg-gray-900 p-4">
                <pre className="overflow-x-auto text-sm text-gray-100">
                  <code>{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${organization?.webhook_secret || "YOUR_SECRET"}" \\
  -d '${JSON.stringify(JSON.parse(examplePayload), null, 2)}'`}</code>
                </pre>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => copyToClipboard(
                  `curl -X POST ${webhookUrl} -H "Content-Type: application/json" -H "Authorization: Bearer ${organization?.webhook_secret || "YOUR_SECRET"}" -d '${examplePayload}'`,
                  "curl"
                )}
              >
                {copied === "curl" ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copy cURL Command
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Logs</CardTitle>
              <CardDescription>Recent webhook requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium">No webhook requests yet</h3>
                  <p className="mt-1 text-gray-500">
                    Webhook requests will appear here once you start sending data
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Endpoint</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Duration</th>
                        <th className="pb-3 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status_code)}
                              {getStatusBadge(log.status_code)}
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm">{log.endpoint}</td>
                          <td className="py-3 text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 text-sm">{log.processing_time_ms}ms</td>
                          <td className="py-3 text-sm text-red-600">
                            {log.error_message || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                <code className="mt-1 block rounded bg-gray-100 px-3 py-2 text-sm">
                  POST {webhookUrl}
                </code>
              </div>

              <div>
                <h4 className="font-medium">Authentication</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Include your webhook secret in the Authorization header:
                </p>
                <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-sm">
                  Authorization: Bearer YOUR_WEBHOOK_SECRET
                </code>
                <p className="mt-2 text-sm text-gray-600">
                  Or sign your request with HMAC-SHA256:
                </p>
                <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-sm">
                  X-Webhook-Signature: sha256=HMAC_SIGNATURE
                </code>
              </div>

              <div>
                <h4 className="font-medium">Request Body</h4>
                <div className="mt-2 rounded-lg bg-gray-900 p-4">
                  <pre className="overflow-x-auto text-sm text-gray-100">
                    <code>{examplePayload}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium">Required Fields</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li><code className="bg-gray-100 px-1">caller_name</code> - Name of the sales rep</li>
                  <li><code className="bg-gray-100 px-1">raw_notes</code> - Call transcript or notes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Optional Fields</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li><code className="bg-gray-100 px-1">caller_email</code> - Caller&apos;s email</li>
                  <li><code className="bg-gray-100 px-1">caller_team</code> - Team/department name</li>
                  <li><code className="bg-gray-100 px-1">customer_name</code> - Customer&apos;s name</li>
                  <li><code className="bg-gray-100 px-1">customer_company</code> - Customer&apos;s company</li>
                  <li><code className="bg-gray-100 px-1">customer_phone</code> - Customer&apos;s phone</li>
                  <li><code className="bg-gray-100 px-1">customer_email</code> - Customer&apos;s email</li>
                  <li><code className="bg-gray-100 px-1">duration</code> - Call duration in seconds</li>
                  <li><code className="bg-gray-100 px-1">external_id</code> - Your unique call ID (for deduplication)</li>
                  <li><code className="bg-gray-100 px-1">metadata</code> - Additional custom data</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Response</h4>
                <p className="mt-1 text-sm text-gray-600">Successful requests return:</p>
                <div className="mt-2 rounded-lg bg-gray-900 p-4">
                  <pre className="overflow-x-auto text-sm text-gray-100">
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
