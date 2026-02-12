"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  UserPlus,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    role: "user",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create invitation");
        setLoading(false);
        return;
      }

      setInviteUrl(data.inviteUrl);
      setSuccess(true);
      setLoading(false);
      onSuccess?.();
    } catch (err) {
      setError("Failed to create invitation");
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFormData({ email: "", role: "user" });
    setError(null);
    setSuccess(false);
    setInviteUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center">
            {success ? "Invitation Created!" : "Invite Team Member"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {success
              ? "Share the invitation link with your new team member"
              : "Send an invitation to join your organization"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <Label className="text-xs text-muted-foreground">
                Invitation Link
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={inviteUrl || ""}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                This link expires in 7 days
              </p>
            </div>

            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Mail className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Email notifications are not yet configured. Please share this
                link directly with the invitee.
              </AlertDescription>
            </Alert>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setInviteUrl(null);
                  setFormData({ email: "", role: "user" });
                }}
                className="flex-1"
              >
                Invite Another
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex flex-col items-start">
                      <span>User</span>
                      <span className="text-xs text-muted-foreground">
                        Can view their own data and participate in sessions
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span>Admin</span>
                      <span className="text-xs text-muted-foreground">
                        Full access to organization settings and all data
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
