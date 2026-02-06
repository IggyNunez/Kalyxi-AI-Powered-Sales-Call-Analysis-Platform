"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, User, Building, Mail, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

interface Caller {
  id: string;
  name: string;
  email?: string;
  team?: string;
}

export default function SubmitCallPage() {
  const router = useRouter();
  const { organization } = useAuth();
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    caller_id: "",
    raw_notes: "",
    customer_name: "",
    customer_company: "",
    customer_email: "",
    customer_phone: "",
  });

  useEffect(() => {
    fetchCallers();
  }, []);

  const fetchCallers = async () => {
    try {
      const res = await fetch("/api/callers");
      if (res.ok) {
        const data = await res.json();
        setCallers(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching callers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!formData.caller_id) {
      setError("Please select a caller");
      setSubmitting(false);
      return;
    }

    if (!formData.raw_notes.trim()) {
      setError("Please enter call notes");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: "manual",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit call");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/calls");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit call");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-xl font-semibold">Call Submitted!</h2>
            <p className="mt-2 text-gray-500">
              Your call has been submitted and queued for AI analysis.
            </p>
            <p className="mt-1 text-sm text-gray-400">Redirecting to calls...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Call</h1>
        <p className="text-gray-500">
          Manually submit call notes for AI analysis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
              <CardDescription>
                Enter the call notes and customer information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="caller">Caller *</Label>
                  <select
                    id="caller"
                    value={formData.caller_id}
                    onChange={(e) => setFormData({ ...formData, caller_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    <option value="">Select a caller...</option>
                    {callers.map((caller) => (
                      <option key={caller.id} value={caller.id}>
                        {caller.name} {caller.team ? `(${caller.team})` : ""}
                      </option>
                    ))}
                  </select>
                  {callers.length === 0 && !loading && (
                    <p className="text-sm text-amber-600">
                      No callers found.{" "}
                      <a href="/dashboard/callers" className="underline">
                        Add a caller first
                      </a>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Call Notes *</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter the full call notes, transcript, or summary..."
                    value={formData.raw_notes}
                    onChange={(e) => setFormData({ ...formData, raw_notes: e.target.value })}
                    rows={10}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Include as much detail as possible for accurate AI analysis
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-4 font-medium">Customer Information (Optional)</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Customer Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="customer_name"
                          placeholder="John Doe"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_company">Company</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="customer_company"
                          placeholder="Acme Corp"
                          value={formData.customer_company}
                          onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="customer_email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="customer_phone"
                          placeholder="+1 (555) 123-4567"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>Submit for Analysis</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips for Better Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Include full context:</strong> The more detail you provide, the more accurate the AI analysis will be.
              </p>
              <p>
                <strong>Note objections:</strong> Include any objections raised by the customer and how they were handled.
              </p>
              <p>
                <strong>Capture outcomes:</strong> Note if an appointment was set, a follow-up scheduled, or a sale made.
              </p>
              <p>
                <strong>Include timestamps:</strong> If available, include approximate timestamps for key moments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>1. Your call will be queued for AI analysis</p>
              <p>2. Our AI will evaluate based on your grading criteria</p>
              <p>3. You&apos;ll receive a detailed scorecard and feedback</p>
              <p>4. View results in the Calls section</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
