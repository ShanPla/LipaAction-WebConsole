"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { displayName, initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { signOut } from "@/app/actions/auth";
import type { ConsoleUser } from "@/lib/auth";

export function ProfileMenu({ official }: { official: ConsoleUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const name = displayName(official.fullName);
  const t = useT();
  // A city account has no barangay. Settings is left out of its menu: the
  // page is barangay-gated, and its alert switches drive the queue.
  const isBarangay = "barangayName" in official;

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
        aria-label={t("shell.accountMenu", { name })}
        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      >
        {/* The button is the 44px target; the circle inside keeps the avatar
            at its 32px size. */}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white transition-shadow group-hover:ring-2 group-hover:ring-brand-200">
          {initials(name)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel"
        >
          <div className="border-b border-ink-100 px-3.5 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">
              {t(`role.${official.role}`)} · {isBarangay ? official.barangayName : t("city.scope")}
            </p>
          </div>

          {isBarangay && (
            <>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center px-3.5 text-sm text-ink-700 hover:bg-ink-100"
              >
                {t("nav.settings")}
              </Link>

              <div className="border-t border-ink-100" />
            </>
          )}

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-11 w-full items-center px-3.5 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
            >
              {t("shell.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
