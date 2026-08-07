"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx, initials } from "@/lib/utils";
import { currentOfficial } from "@/data/mockSettings";

const primaryNav = [
  { href: "/queue", label: "Queue", icon: "▤" },
  { href: "/cluster-explorer", label: "Cluster Explorer", icon: "◎" },
];

const secondaryNav = [
  { href: "/validation-history", label: "Validation History", icon: "✓" },
  { href: "/audit-log", label: "Audit Log", icon: "≣" },
];

const bottomNav = [{ href: "/settings", label: "Settings", icon: "⚙" }];

function NavLink({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand-100 text-brand-700"
          : "text-ink-700 hover:bg-ink-100"
      )}
    >
      <span className="w-4 text-center text-[13px]" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
          L
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink-900">LipaAction</p>
          <p className="text-[11px] text-ink-500">Barangay console</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Records
          </p>
          <div className="flex flex-col gap-0.5">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Account
          </p>
          <div className="flex flex-col gap-0.5">
            {bottomNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-ink-100 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {initials(currentOfficial.name)}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-ink-900">{currentOfficial.name}</p>
          <p className="text-[11px] text-ink-500">
            Brgy. Secretary · {currentOfficial.barangay}
          </p>
        </div>
      </div>
    </aside>
  );
}
