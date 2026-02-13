"use client";

import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  userName?: string;
  isAdmin: boolean;
}

export function HeroSection({ userName, isAdmin }: HeroSectionProps) {
  const firstName = userName?.split(" ")[0] || "there";

  return (
    <div className="space-y-2">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Hey {firstName}
      </h1>
      <p className="text-muted-foreground max-w-lg">
        Grade your sales calls with AI. Create templates to automatically score
        calls from Google Meet.
      </p>
      <div className="flex items-center gap-3 pt-2">
        {isAdmin ? (
          <Link href="/dashboard/templates/new">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </Link>
        ) : (
          <Link href="/dashboard/sessions">
            <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
              <BarChart3 className="h-4 w-4" />
              View My Results
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
