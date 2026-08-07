"use client";

import { cx } from "@/lib/utils";
import type { QueueTabId } from "@/types";

export function QueueTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: QueueTabId; label: string; count: number }[];
  activeTab: QueueTabId;
  onChange: (id: QueueTabId) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-1 border-b border-ink-100">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cx(
              "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brand-700" : "text-ink-500 hover:text-ink-900"
            )}
          >
            {tab.label}
            <span
              className={cx(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                active ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
              )}
            >
              {tab.count}
            </span>
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
