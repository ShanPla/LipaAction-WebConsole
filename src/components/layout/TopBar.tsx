import { ProfileMenu } from "./ProfileMenu";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { usePreferences, type InterfaceLanguage } from "@/lib/preferences";
import type { BarangayRole, OfficialProfile } from "@/lib/auth";

export interface TopBarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

// Each language is named in itself, with its own lang attribute, so a screen
// reader announces [Tagalog] correctly while the page is in English and the
// reverse. The visible codes are the paper's (A.3, top-right EN/TL switch).
const LANGUAGES: { value: InterfaceLanguage; code: string; name: string }[] = [
  { value: "en", code: "EN", name: "English" },
  { value: "tl", code: "TL", name: "Tagalog" },
];

/**
 * The same preference as Settings → Language, from the shared store, so the
 * two can never disagree. Disabled until hydration: before then the server's
 * role default is on screen, and a click could land on a value about to be
 * replaced by the stored one.
 */
function LanguageSwitch({ role }: { role: BarangayRole }) {
  const { prefs, update, hydrated } = usePreferences(role);
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t("shell.language")}
      className="inline-flex shrink-0 rounded-md border border-ink-100 bg-ink-50 p-0.5"
    >
      {LANGUAGES.map((option) => {
        const active = prefs.interfaceLanguage === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-label={option.name}
            aria-pressed={active}
            disabled={!hydrated}
            onClick={() => update({ interfaceLanguage: option.value })}
            className={cx(
              "h-7 rounded px-2 text-xs font-semibold transition-colors disabled:opacity-60",
              active ? "bg-white text-brand-700 shadow-panel" : "text-ink-500 hover:text-ink-900"
            )}
          >
            {option.code}
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({
  breadcrumb,
  actions,
  official,
  search,
  onMenuClick,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
  official: OfficialProfile;
  // Omitted by pages that don't filter. The box used to render everywhere
  // while being wired to nothing — a permanently dead input on five pages.
  search?: TopBarSearch;
  onMenuClick?: () => void;
}) {
  const t = useT();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t("shell.openMenu")}
          className="rounded-md p-1.5 text-ink-700 hover:bg-ink-100 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 truncate text-sm text-ink-500" aria-label={t("shell.breadcrumb")}>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              <span className={i === breadcrumb.length - 1 ? "font-medium text-ink-900" : ""}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {search && (
          <label className="hidden items-center gap-2 rounded-md border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-xs text-ink-500 md:flex">
            <Icon name="search" className="h-3.5 w-3.5" />
            <span className="sr-only">{search.label}</span>
            <input
              type="search"
              aria-label={search.label}
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="w-56 bg-transparent text-xs text-ink-700 placeholder:text-ink-500 focus:outline-none"
            />
          </label>
        )}
        {actions}
        <LanguageSwitch role={official.role} />
        <ProfileMenu official={official} />
      </div>
    </header>
  );
}
