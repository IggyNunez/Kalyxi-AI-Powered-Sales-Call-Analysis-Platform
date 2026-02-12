"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreateSessionFromCallButtonProps {
  callId: string;
  callerId?: string;
  callerName?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function CreateSessionFromCallButton({
  callId,
  callerId,
  callerName,
  variant = "outline",
  size = "default",
  className,
  showLabel = true,
}: CreateSessionFromCallButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    setIsNavigating(true);

    // Build URL with query params
    const params = new URLSearchParams({ call_id: callId });
    if (callerId) {
      params.set("caller_id", callerId);
    }
    if (callerName) {
      params.set("caller_name", callerName);
    }

    router.push(`/dashboard/sessions/new?${params.toString()}`);
  };

  const buttonContent = (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isNavigating}
      className={cn("gap-2", className)}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ClipboardCheck className="h-4 w-4" />
      )}
      {showLabel && (size !== "icon" ? "Create Session" : null)}
    </Button>
  );

  // Wrap in tooltip for icon-only variant
  if (size === "icon" || !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent>
            <p>Create coaching session for this call</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
