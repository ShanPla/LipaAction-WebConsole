import type { Metadata } from "next";

// The city dashboard's own name in the browser tab and in the header of a
// printed page, which read [Barangay Web Console] on every city page. Only
// the title changes; each page still renders its own shell.
export const metadata: Metadata = {
  title: "LipaAction — City Console",
  description: "The municipal administrator's read-only view of LipaAction reports across Lipa City.",
};

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
