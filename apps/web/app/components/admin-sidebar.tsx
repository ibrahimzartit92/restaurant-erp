'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserSummary } from '../lib/types';

type NavigationItem = {
  href: string;
  label: string;
  mark: string;
  permissionCodes?: string[];
};

const navigationItems: NavigationItem[] = [
  { href: '/', label: 'الرئيسية', mark: 'ر' },
  { href: '/users', label: 'المستخدمون', mark: 'م', permissionCodes: ['view_users'] },
  { href: '/roles', label: 'الأدوار', mark: 'د', permissionCodes: ['manage_roles'] },
  { href: '/permissions', label: 'الصلاحيات', mark: 'ص', permissionCodes: ['manage_permissions'] },
  { href: '/branches', label: 'الفروع', mark: 'ف', permissionCodes: ['view_branches'] },
  { href: '/warehouses', label: 'المخازن', mark: 'خ', permissionCodes: ['view_warehouses'] },
  { href: '/items', label: 'المواد', mark: 'و', permissionCodes: ['view_items'] },
  { href: '/suppliers', label: 'الموردون', mark: 'س', permissionCodes: ['view_suppliers'] },
  { href: '/purchase-invoices', label: 'فواتير الشراء', mark: 'ش', permissionCodes: ['view_purchase_invoices'] },
  { href: '/supplier-payments', label: 'دفعات الموردين', mark: 'ض', permissionCodes: ['view_supplier_payments'] },
  { href: '/drawers', label: 'الأدراج', mark: 'ج', permissionCodes: ['view_drawers'] },
  { href: '/drawer-daily-sessions', label: 'جلسات الدرج', mark: 'ل' },
  { href: '/drawer-transactions', label: 'حركات الدرج', mark: 'ح' },
  { href: '/expenses', label: 'المصاريف', mark: 'ص', permissionCodes: ['view_expenses'] },
  { href: '/expense-categories', label: 'أنواع المصاريف', mark: 'ن' },
  { href: '/expense-templates', label: 'قوالب المصاريف', mark: 'ق' },
  { href: '/daily-sales', label: 'المبيعات اليومية', mark: 'ي', permissionCodes: ['view_daily_sales'] },
  { href: '/transfers', label: 'التحويل بين الفروع', mark: 'ت' },
  { href: '/employees', label: 'الموظفون', mark: 'ظ' },
  { href: '/payroll', label: 'الرواتب', mark: 'ب' },
  { href: '/reports', label: 'التقارير', mark: 'ر', permissionCodes: ['view_reports'] },
  { href: '/settings', label: 'الإعدادات', mark: 'ع', permissionCodes: ['manage_settings'] },
];

function canSeeItem(item: NavigationItem, currentUser: UserSummary | null) {
  if (!item.permissionCodes?.length || !currentUser) {
    return true;
  }

  return item.permissionCodes.some((permissionCode) => currentUser.permissions.includes(permissionCode));
}

export function AdminSidebar({ currentUser }: Readonly<{ currentUser: UserSummary | null }>) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter((item) => canSeeItem(item, currentUser));

  return (
    <aside className="admin-sidebar" aria-label="القائمة الرئيسية">
      <div className="brand-block">
        <div className="brand-logo">ERP</div>
        <div>
          <p className="brand-name">إدارة المطعم</p>
          <p className="brand-subtitle">لوحة التحكم</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link className={`sidebar-link ${isActive ? 'active' : ''}`} href={item.href} key={item.href}>
              <span className="sidebar-link-mark">{item.mark}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
