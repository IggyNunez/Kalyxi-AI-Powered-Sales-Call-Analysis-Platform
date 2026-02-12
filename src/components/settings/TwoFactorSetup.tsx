"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  AlertTriangle,
  Smartphone,
  Key,
} from "lucide-react";

interface TwoFactorSetupProps {
  enabled?: boolean;
  onStatusChange?: (enabled: boolean) => void;
}

export function TwoFactorSetup({
  enabled = false,
  onStatusChange,
}: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [step, setStep] = useState<"qr" | "verify" | "recovery">("qr");
  const [error, setError] = useState<string | null>(null);

  // Setup state
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to setup 2FA");
        setLoading(false);
        return;
      }

      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setRecoveryCodes(data.recoveryCodes);

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(qrDataUrl);

      setSetupDialogOpen(true);
      setStep("qr");
      setLoading(false);
    } catch (err) {
      setError("Failed to setup 2FA");
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      setStep("recovery");
      setLoading(false);
    } catch (err) {
      setError("Verification failed");
      setLoading(false);
    }
  };

  const handleFinishSetup = () => {
    setIsEnabled(true);
    setSetupDialogOpen(false);
    setStep("qr");
    setVerificationCode("");
    setSecret(null);
    setOtpauthUrl(null);
    setQrCodeDataUrl(null);
    setRecoveryCodes([]);
    onStatusChange?.(true);
  };

  const handleDisable2FA = async () => {
    if (disableCode.length < 6) {
      setError("Please enter a valid code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to disable 2FA");
        setLoading(false);
        return;
      }

      setIsEnabled(false);
      setDisableDialogOpen(false);
      setDisableCode("");
      setLoading(false);
      onStatusChange?.(false);
    } catch (err) {
      setError("Failed to disable 2FA");
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isEnabled
                    ? "bg-green-500/10 text-green-500"
                    : "bg-gray-500/10 text-gray-500"
                }`}
              >
                {isEnabled ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Two-factor authentication adds an extra layer of security to your
            account by requiring a verification code from your phone in addition
            to your password.
          </p>

          {isEnabled ? (
            <Button
              variant="outline"
              onClick={() => setDisableDialogOpen(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              Disable 2FA
            </Button>
          ) : (
            <Button onClick={handleStartSetup} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Enable 2FA
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "qr" && "Set Up Two-Factor Authentication"}
              {step === "verify" && "Verify Your Device"}
              {step === "recovery" && "Save Recovery Codes"}
            </DialogTitle>
            <DialogDescription>
              {step === "qr" &&
                "Scan the QR code with your authenticator app"}
              {step === "verify" &&
                "Enter the 6-digit code from your authenticator app"}
              {step === "recovery" &&
                "Save these recovery codes in a safe place"}
            </DialogDescription>
          </DialogHeader>

          {step === "qr" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="rounded-lg border"
                  />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse bg-muted rounded-lg" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Or enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                    {secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertTitle>Recommended Apps</AlertTitle>
                <AlertDescription className="text-xs">
                  Google Authenticator, Microsoft Authenticator, Authy, or 1Password
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSetupDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setStep("verify")}>
                  Next: Verify Code
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("qr")}>
                  Back
                </Button>
                <Button onClick={handleVerify} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "recovery" && (
            <div className="space-y-4">
              <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-500">Important!</AlertTitle>
                <AlertDescription className="text-amber-200/80">
                  Save these recovery codes. Each code can only be used once.
                  Store them securely - you won&apos;t see them again.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border bg-muted p-4">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, index) => (
                    <code
                      key={index}
                      className="rounded bg-background px-2 py-1 text-center font-mono text-sm"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={copyRecoveryCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Recovery Codes
                  </>
                )}
              </Button>

              <DialogFooter>
                <Button onClick={handleFinishSetup} className="w-full">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  I&apos;ve Saved My Codes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your verification code or a recovery code to disable 2FA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                type="text"
                placeholder="Enter code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="text-center font-mono"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDisableDialogOpen(false);
                  setDisableCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  "Disable 2FA"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
