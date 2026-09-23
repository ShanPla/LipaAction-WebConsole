import {
  BarChart3,
  Check,
  ClipboardCheck,
  FileText,
  Inbox,
  Layers,
  Lock,
  Menu,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/utils";

export type IconName =
  | "search"
  | "menu"
  | "close"
  | "check"
  | "lock"
  | "queue"
  | "clusters"
  | "history"
  | "reports"
  | "audit"
  | "settings";

/**
 * The console's icons, from Lucide (lucide-react, ISC licence).
 *
 * Components ask for an icon by name, never by importing from lucide-react
 * directly, so the set stays small and swappable in this one file. Always
 * decorative: the control or text next to an icon carries the meaning, so it
 * is hidden from screen readers. Size it with a className (h-4 w-4 default).
 */
const ICONS: Record<IconName, LucideIcon> = {
  search: Search,
  menu: Menu,
  close: X,
  check: Check,
  lock: Lock,
  queue: Inbox, // the reports waiting for a decision
  clusters: Layers, // reports grouped as one incident
  history: ClipboardCheck, // decisions already made
  reports: BarChart3,
  audit: FileText, // the written trail
  settings: SlidersHorizontal,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden="true" focusable="false" strokeWidth={2} className={cx("h-4 w-4 shrink-0", className)} />;
}
