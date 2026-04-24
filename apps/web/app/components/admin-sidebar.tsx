'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserSummary } from '../lib/types';

type NavigationItem = {
  href: string;
  label: string;
  mark: string;
  permissionCodes?: string[];
  alwaysVisible?: boolean;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: 'الوصول والإدارة',
    items: [
      { href: '/users', label: 'المستخدمون', mark: 'م', permissionCodes: ['view_users'], alwaysVisible: true },
      { href: '/roles', label: 'الأدوار', mark: 'د', permissionCodes: ['manage_roles'], alwaysVisible: true },
      { href: '/permissions', label: 'الصلاحيات', mark: 'ص', permissionCodes: ['manage_permissions'], alwaysVisible: true },
    ],
  },
  {
    title: 'المال والبنوك',
    items: [
      { href: '/bank-accounts', label: 'الحسابات البنكية', mark: 'ب', alwaysVisible: true },
      { href: '/bank-account-transactions', label: 'حركات البنك', mark: 'ح', alwaysVisible: true },
    ],
  },
  {
    title: 'لوحة العمل',
    items: [
      { href: '/', label: 'الرئيسية', mark: 'ر', alwaysVisible: true },
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
      { href: '/stock-counts', label: 'الجرد', mark: 'ع' },
      { href: '/employees', label: 'الموظفون', mark: 'ظ' },
      { href: '/payroll', label: 'الرواتب', mark: 'ب' },
      { href: '/reports', label: 'التقارير', mark: 'ر', permissionCodes: ['view_reports'] },
      { href: '/settings', label: 'الإعدادات', mark: 'إ', permissionCodes: ['manage_settings'] },
    ],
  },
];

function canSeeItem(item: NavigationItem, currentUser: UserSummary | null) {
  if (item.alwaysVisible) {
    return true;
  }

  if (!item.permissionCodes?.length || !currentUser) {
    return true;
  }

  return item.permissionCodes.some((permissionCode) => currentUser.permissions.includes(permissionCode));
}

export function AdminSidebar({ currentUser }: Readonly<{ currentUser: UserSummary | null }>) {
  const pathname = usePathname();
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeItem(item, currentUser)),
    }))
    .filter((section) => section.items.length > 0);

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
        {visibleSections.map((section) => (
          <section className="sidebar-section" key={section.title}>
            <p className="sidebar-section-title">{section.title}</p>
            <div className="sidebar-section-links">
              {section.items.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

                return (
                  <Link className={`sidebar-link ${isActive ? 'active' : ''}`} href={item.href} key={item.href}>
                    <span className="sidebar-link-mark">{item.mark}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
