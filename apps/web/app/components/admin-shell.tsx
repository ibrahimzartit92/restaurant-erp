import { getCurrentUser } from '../lib/server-auth';
import { AdminSidebar } from './admin-sidebar';
import { TopHeader } from './top-header';

export async function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <div className="admin-shell">
      <AdminSidebar currentUser={currentUser} />
      <div className="admin-main">
        <TopHeader currentUser={currentUser} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
