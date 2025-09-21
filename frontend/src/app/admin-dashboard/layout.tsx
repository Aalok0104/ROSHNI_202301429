import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROSHNI - Admin Dashboard",
  description: "Disaster Response Coordination Platform - Admin Dashboard",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
