"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Loader2, AlertCircle, Sparkles, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_callback_error") {
      setError("Authentication failed. Please try again.");
    } else if (errorParam === "verification_failed") {
      setError("Email verification failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please confirm your email before logging in");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        const redirectTo = searchParams.get("redirect") || "/dashboard";
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: "AI-powered call analysis" },
    { icon: BarChart3, text: "Real-time performance insights" },
    { icon: Shield, text: "Enterprise-grade security" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - Gradient with branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

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
                Transform your sales calls into
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> actionable insights</span>
              </h1>
              <p className="text-lg text-gray-300 max-w-md">
                Join thousands of sales teams using AI to improve their performance and close more deals.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-gray-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <feature.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <p className="text-gray-300 italic">
                &quot;Kalyxi has completely transformed how we train our sales team. The AI insights are incredibly accurate.&quot;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                <div>
                  <p className="text-white font-medium">Sarah Johnson</p>
                  <p className="text-sm text-gray-400">VP of Sales, TechCorp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
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
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {magicLinkSent ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center space-y-3 animate-scale-in">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a magic link to <span className="font-medium text-foreground">{formData.email}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMagicLinkSent(false)}
                className="mt-2"
              >
                Try another method
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600 animate-shake">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  autoComplete="current-password"
                  icon={<Lock className="h-4 w-4" />}
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full h-12 text-base"
                disabled={loading}
                loading={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}

          {!magicLinkSent && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="space-y-3">
                <OAuthButtons redirectTo={searchParams.get("redirect") || undefined} />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 gap-2"
                  onClick={handleMagicLink}
                  disabled={loading}
                >
                  <Sparkles className="h-4 w-4" />
                  Send Magic Link
                </Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              Create one
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt="Kalyxi"
          width={150}
          height={45}
          className="h-10 w-auto object-contain animate-pulse"
        />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
