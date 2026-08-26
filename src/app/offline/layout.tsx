import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're Offline — TTC Network",
  description: "It looks like you've lost your internet connection. Check your connection and try again.",
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
