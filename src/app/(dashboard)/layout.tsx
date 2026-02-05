import { DashboardLayoutClient } from "./layout-client";

// Force dynamic rendering for all dashboard pages
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
