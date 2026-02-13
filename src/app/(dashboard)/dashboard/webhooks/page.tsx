"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WebhooksRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=advanced");
  }, [router]);

  return null;
}
