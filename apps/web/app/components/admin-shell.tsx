import { redirect } from 'next/navigation';
import { getInactivityTimeoutMinutes } from '../lib/api';
import { getCurrentUser } from '../lib/server-auth';
import { AdminSidebar } from './admin-sidebar';
import { SessionTimeoutGuard } from './session-timeout-guard';
import { TabAuthGuard } from './tab-auth-guard';
import { TopHeader } from './top-header';

export async function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.mustChangePassword) {
    redirect('/change-password');
  }

  const inactivityTimeoutMinutes = await getInactivityTimeoutMinutes();

  return (
    <div className="admin-shell">
      <TabAuthGuard />
      <AdminSidebar currentUser={currentUser} />
      <div className="admin-main">
        <TopHeader currentUser={currentUser} />
        <SessionTimeoutGuard timeoutMinutes={inactivityTimeoutMinutes} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
