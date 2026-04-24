import type { UserSummary } from '../lib/types';

export function TopHeader({ currentUser }: Readonly<{ currentUser: UserSummary | null }>) {
  return (
    <header className="top-header">
      <div>
        <p className="eyebrow">نظام إدارة المطاعم</p>
        <h1>لوحة الإدارة</h1>
      </div>
      <div className="header-actions" aria-label="إجراءات الحساب">
        <div className="search-shell">
          <span aria-hidden="true">⌕</span>
          <input aria-label="بحث سريع" placeholder="بحث سريع" />
        </div>
        <div className="user-chip">
          <span className="user-avatar">{currentUser?.fullName?.slice(0, 1) ?? 'إ'}</span>
          <span>{currentUser?.fullName ?? 'الإدارة'}</span>
        </div>
      </div>
    </header>
  );
}
