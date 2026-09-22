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
  | "settings"
  | "system";

/**
 * The console's icons, drawn as inline SVG strokes.
 *
 * They replace emoji and text symbols (🔍, 🔒, ☰, ⚙, ▤ …), which every
 * operating system draws differently — Windows paints 🔍 as a coloured
 * picture, other fonts show ⚙ as a tiny glyph — and which can't take the
 * console's colour tokens. These inherit `currentColor`, so an icon is always
 * the colour of the text beside it, active and hover states included.
 *
 * No icon library: twelve simple shapes don't justify a dependency, and
 * inline SVG needs nothing fetched at runtime. Always decorative — the
 * control or text next to an icon carries the meaning, so it is hidden from
 * screen readers. Size it with a className (h-4 w-4 by default).
 */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cx("h-4 w-4 shrink-0", className)}
    >
      {SHAPES[name]}
    </svg>
  );
}

const SHAPES: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  // A tray of stacked items: the reports waiting for a decision.
  queue: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M7.5 9h9M7.5 13h9M7.5 17h5" />
    </>
  ),
  // Overlapping circles: reports grouped as one incident.
  clusters: (
    <>
      <circle cx="9" cy="9.5" r="4" />
      <circle cx="15" cy="9.5" r="4" />
      <circle cx="12" cy="15" r="4" />
    </>
  ),
  // A clipboard with a tick: decisions already made.
  history: (
    <>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9.5 3h5v3h-5z" />
      <path d="M9 13.5l2.2 2.2 4-4.5" />
    </>
  ),
  reports: <path d="M4 20h16M7.5 20v-6M12 20V8M16.5 20v-9.5" />,
  // A page of lines: the written trail.
  audit: (
    <>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4M10 12h5M10 16h5" />
    </>
  ),
  // Sliders rather than a gear: fewer strokes, and it still reads as settings.
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  // A chip: an entry the system made, not a person.
  system: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" />
    </>
  ),
};
