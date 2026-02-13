"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleConnectionsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Forward any OAuth callback params to the settings connections tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "connections");
    router.replace(`/dashboard/settings?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}
