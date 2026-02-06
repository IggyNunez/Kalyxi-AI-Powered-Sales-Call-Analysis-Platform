import { DashboardLayoutClient } from "../(dashboard)/layout-client";

// Force dynamic rendering for all admin pages
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
