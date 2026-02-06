"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Building2, Loader2, AlertCircle, CheckCircle, ArrowRight, Zap, Shield, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            company_name: formData.companyName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("An account with this email already exists");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (authData.user && !authData.session) {
        // Email confirmation required
        setStep("verify");
      } else if (authData.session) {
        // Auto-confirmed (e.g., in development)
        // Create organization and user record via API
        const response = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authData.user?.id,
            name: formData.name,
            email: formData.email,
            companyName: formData.companyName,
            companySlug: generateSlug(formData.companyName),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to set up account");
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: "AI-powered call analysis" },
    { icon: BarChart3, text: "Real-time performance insights" },
    { icon: Users, text: "Team performance tracking" },
    { icon: Shield, text: "Enterprise-grade security" },
  ];

  if (step === "verify") {
    return (
      <div className="flex min-h-screen">
        {/* Left side - Gradient */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />

          <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-scale-in">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Almost there!</h1>
              <p className="text-lg text-gray-300 max-w-md">
                Just one more step to unlock the power of AI-driven sales insights.
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Verification message */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md space-y-8 animate-fade-in text-center">
            <div className="lg:hidden mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
              <p className="mt-4 text-muted-foreground">
                We&apos;ve sent a confirmation link to
              </p>
              <p className="mt-1 font-semibold text-lg">{formData.email}</p>
            </div>

            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in your email to verify your account and complete registration.
              </p>
              <div className="flex items-start gap-3 text-left bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">Didn&apos;t receive the email?</p>
                  <p className="text-muted-foreground mt-1">Check your spam folder or try registering again.</p>
                </div>
              </div>
            </div>

            <Link href="/login">
              <Button variant="outline" className="gap-2">
                Back to login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Gradient with branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/logo-white.png"
              alt="Kalyxi"
              width={150}
              height={45}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Start your journey to
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> sales excellence</span>
              </h1>
              <p className="text-lg text-gray-300 max-w-md">
                Get AI-powered insights from your sales calls and improve your team&apos;s performance.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-gray-300 animate-fade-in-up"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <feature.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-center">
              <p className="text-sm text-gray-400">Built with security-first architecture</p>
              <p className="text-xs text-gray-500 mt-1">Row-level security • Encrypted data • Multi-tenant isolation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6 animate-fade-in py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Kalyxi"
              width={150}
              height={45}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
            <p className="mt-2 text-muted-foreground">
              Start analyzing your sales calls with AI
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600 animate-shake">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Sales Inc."
                value={formData.companyName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, companyName: e.target.value }))
                }
                required
                autoComplete="organization"
                icon={<Building2 className="h-4 w-4" />}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                This will be your organization in Kalyxi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Your Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                autoComplete="name"
                icon={<User className="h-4 w-4" />}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                required
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8+ characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  icon={<Lock className="h-4 w-4" />}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  autoComplete="new-password"
                  icon={<Lock className="h-4 w-4" />}
                  className="h-12"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full h-12 text-base"
              disabled={loading}
              loading={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              Sign in
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
