"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";

const filterOptions = ["Today", "Last 7d", "State changes only", "PII access", "All actors"];

/**
 * Filter chips only. The [Export CSV] button that sat beside them fired a
 * success toast claiming N events had been exported while writing no file —
 * and the N was a fixture count. Removed rather than wired: there are no
 * real rows on this page to export until barangay roles get a read path to
 * audit_logs, and that is a data-protection decision pending elsewhere.
 * Validation History has the working export to copy from when this unblocks.
 *
 * The chips keep their highlight state so the layout reads as intended in
 * the mockups; they filter nothing, and the notice above the table says so.
 */
export function AuditFilters() {
  const [active, setActive] = useState("Last 7d");

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setActive(opt)}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active === opt
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
