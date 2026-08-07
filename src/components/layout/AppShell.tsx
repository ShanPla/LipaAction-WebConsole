import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({
  breadcrumb,
  actions,
  children,
}: {
  breadcrumb: string[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar breadcrumb={breadcrumb} actions={actions} />
        <main className="flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
