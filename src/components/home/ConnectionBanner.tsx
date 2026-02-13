"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectionBanner() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
        <Calendar className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Connect Google Calendar</p>
        <p className="text-xs text-muted-foreground">
          Auto-capture calls from Google Meet to start grading
        </p>
      </div>
      <Link href="/dashboard/settings?tab=connections">
        <Button size="sm" variant="outline" className="flex-shrink-0">
          Connect
        </Button>
      </Link>
    </div>
  );
}
