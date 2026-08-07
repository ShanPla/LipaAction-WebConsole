import { initials } from "@/lib/utils";
import { currentOfficial } from "@/data/mockSettings";

export function TopBar({
  breadcrumb,
  actions,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
      <nav className="flex items-center gap-1.5 text-sm text-ink-500" aria-label="Breadcrumb">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            <span className={i === breadcrumb.length - 1 ? "font-medium text-ink-900" : ""}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-md border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-xs text-ink-500 md:flex">
          <span aria-hidden>🔍</span>
          Search report ID, reporter, address&hellip;
        </div>
        {actions}
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {initials(currentOfficial.name)}
        </span>
      </div>
    </header>
  );
}
