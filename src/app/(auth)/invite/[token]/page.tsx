"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Building,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

interface InvitationData {
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
  };
  expires_at: string;
}

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!data.valid) {
          setError(data.error || "Invalid invitation");
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
        setLoading(false);
      } catch (err) {
        setError("Failed to validate invitation");
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError("Failed to accept invitation");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
        <Card className="w-full max-w-md border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="mt-4 text-gray-400">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
        <Card className="w-full max-w-md border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-white">
              Invalid Invitation
            </CardTitle>
            <CardDescription className="text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
        <Card className="w-full max-w-md border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-xl text-white">
              Account Created!
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your account has been created successfully. Redirecting to
              login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-white/10 bg-gray-900/50 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <Image
              src="/logo-white.png"
              alt="Kalyxi"
              width={140}
              height={40}
              className="h-10 w-auto"
            />
          </div>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
            <UserPlus className="h-7 w-7 text-white" />
          </div>

          <div>
            <CardTitle className="text-xl text-white">
              You&apos;ve Been Invited!
            </CardTitle>
            <CardDescription className="mt-2 text-gray-400">
              Complete your account setup to join{" "}
              <span className="text-white font-medium">
                {invitation?.organization.name}
              </span>
            </CardDescription>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <Building className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-gray-300">
              {invitation?.organization.name}
            </span>
            <Badge
              variant="secondary"
              className="ml-2 bg-purple-500/20 text-purple-300"
            >
              {invitation?.role}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ""}
                disabled
                className="border-white/10 bg-white/5 text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-gray-500"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-purple-400 hover:text-purple-300"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
