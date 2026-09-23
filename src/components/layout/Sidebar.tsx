"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx, displayName, initials } from "@/lib/utils";
import { useT, type MessageKey } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { OfficialProfile } from "@/lib/auth";

type NavItem = { href: string; label: MessageKey; icon: IconName };

const primaryNav: NavItem[] = [
  { href: "/queue", label: "nav.queue", icon: "queue" },
  { href: "/cluster-explorer", label: "nav.clusterExplorer", icon: "clusters" },
];

const secondaryNav: NavItem[] = [
  { href: "/validation-history", label: "nav.validationHistory", icon: "history" },
  { href: "/reports", label: "nav.reports", icon: "reports" },
  { href: "/audit-log", label: "nav.auditLog", icon: "audit" },
];

const bottomNav: NavItem[] = [{ href: "/settings", label: "nav.settings", icon: "settings" }];

function NavLink({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: MessageKey;
  icon: IconName;
  active: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
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
      <Icon name={icon} />
      {t(label)}
    </Link>
  );
}

export function Sidebar({
  official,
  onNavigate,
}: {
  official: OfficialProfile;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const name = displayName(official.fullName);
  const t = useT();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
          L
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink-900">LipaAction</p>
          <p className="text-[11px] text-ink-500">{t("shell.consoleName")}</p>
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
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {t("nav.records")}
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
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {t("nav.account")}
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
          {initials(name)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-ink-900">{name}</p>
          <p className="truncate text-[11px] text-ink-500">
            {t(`role.${official.role}`)} · {official.barangayName}
          </p>
        </div>
      </div>
    </aside>
  );
}
