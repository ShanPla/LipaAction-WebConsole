import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "LipaAction — Barangay Web Console",
  // Said [Static UI mockup] until 2026-09 — false since the console went
  // live against the real database, and now public on the deployed URL.
  description:
    "Barangay officials’ console for reviewing and routing LipaAction incident reports.",
  // A sign-in page for pre-provisioned officials has no business in a search
  // index. Nothing here is secret — the page is public — but listing it only
  // invites credential-stuffing traffic at an OTP form.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
