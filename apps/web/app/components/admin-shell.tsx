import { AdminSidebar } from './admin-sidebar';
import { TopHeader } from './top-header';

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <TopHeader />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
