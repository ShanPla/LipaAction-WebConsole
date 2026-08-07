import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
