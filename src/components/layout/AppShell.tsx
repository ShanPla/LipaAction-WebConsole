"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar, type TopBarSearch } from "./TopBar";
import type { OfficialProfile } from "@/lib/auth";

export function AppShell({
  breadcrumb,
  actions,
  official,
  search,
  children,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
  official: OfficialProfile;
  search?: TopBarSearch;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
            aria-label="Close navigation"
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
        <main id="main-content" className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
