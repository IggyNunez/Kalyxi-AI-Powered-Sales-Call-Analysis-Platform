"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SkillsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=skills");
  }, [router]);

  return null;
}
