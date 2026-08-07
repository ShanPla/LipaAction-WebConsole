import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "LipaAction — Barangay Web Console",
  description:
    "Static UI mockup of the LipaAction Barangay Web Console (Queue, Cluster Explorer, Validation History, Audit Log, Settings).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
