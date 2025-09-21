import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROSHNI - User Dashboard",
  description: "Disaster Response Coordination Platform - User Dashboard",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
