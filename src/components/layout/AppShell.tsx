"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar, type TopBarSearch } from "./TopBar";
import { useT } from "@/lib/i18n";
import type { ConsoleUser } from "@/lib/auth";

export function AppShell({
  breadcrumb,
  actions,
  official,
  search,
  children,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
  // A barangay official or a city account; the sidebar picks its links
  // and the scope line from which one it is.
  official: ConsoleUser;
  search?: TopBarSearch;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useT();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar official={official} />
      </div>

      {/* Mobile off-canvas sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label={t("shell.closeMenu")}
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-50 h-full">
            <Sidebar official={official} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          breadcrumb={breadcrumb}
          actions={actions}
          official={official}
          search={search}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        {/* relative: the page's scroll area must also be the box that
            absolutely positioned content (every sr-only label) is placed in.
            Without it, a label far down a long list was placed against the
            whole document instead, escaped this area's clipping and gave the
            page a second scrollbar onto blank space below the shell. */}
        <main id="main-content" className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
