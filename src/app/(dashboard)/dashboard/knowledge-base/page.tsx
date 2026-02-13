"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KnowledgeBaseRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=knowledge-base");
  }, [router]);

  return null;
}
