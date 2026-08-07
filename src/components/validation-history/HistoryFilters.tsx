"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const rangeOptions = ["Today", "Last 7d", "All officials"];
const outcomeOptions = ["All outcomes", "Confirmed", "Rejected"];

export function HistoryFilters() {
  const [range, setRange] = useState("Last 7d");
  const [outcome, setOutcome] = useState("All outcomes");

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {rangeOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setRange(opt)}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              range === opt
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            )}
          >
            {opt}
          </button>
        ))}
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
        >
          {outcomeOptions.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <Button variant="secondary" size="sm">
        Export CSV
      </Button>
    </div>
  );
}
