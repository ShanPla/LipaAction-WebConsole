import { initials } from "@/lib/utils";
import { currentOfficial } from "@/data/mockSettings";

export function TopBar({
  breadcrumb,
  actions,
  onMenuClick,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-md p-1.5 text-ink-700 hover:bg-ink-100 lg:hidden"
        >
          <span aria-hidden className="text-lg leading-none">
            ☰
          </span>
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 truncate text-sm text-ink-500" aria-label="Breadcrumb">
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
        <label className="hidden items-center gap-2 rounded-md border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-xs text-ink-500 md:flex">
          <span aria-hidden>🔍</span>
          <span className="sr-only">Search report ID, reporter, or address</span>
          <input
            type="search"
            aria-label="Search report ID, reporter, or address"
            placeholder="Search report ID, reporter, address…"
            className="w-56 bg-transparent text-xs text-ink-700 placeholder:text-ink-500 focus:outline-none"
          />
        </label>
        {actions}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {initials(currentOfficial.name)}
        </span>
      </div>
    </header>
  );
}
