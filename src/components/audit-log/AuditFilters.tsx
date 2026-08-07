"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const filterOptions = ["Today", "Last 7d", "State changes only", "PII access", "All actors"];

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
      <Button variant="secondary" size="sm">
        Export CSV
      </Button>
    </div>
  );
}
