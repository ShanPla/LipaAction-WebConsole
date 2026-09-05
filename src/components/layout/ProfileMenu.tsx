"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { displayName, initials, roleLabel } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import type { OfficialProfile } from "@/lib/auth";

export function ProfileMenu({ official }: { official: OfficialProfile }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const name = displayName(official.fullName);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white transition-shadow hover:ring-2 hover:ring-brand-200"
      >
        {initials(name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel"
        >
          <div className="border-b border-ink-100 px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">
              {roleLabel(official.role)} · {official.barangayName}
            </p>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-ink-700 hover:bg-ink-100"
          >
            Settings
          </Link>

          <div className="border-t border-ink-100" />

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3.5 py-2.5 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
