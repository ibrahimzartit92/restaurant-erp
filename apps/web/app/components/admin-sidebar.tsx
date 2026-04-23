'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { href: '/', label: 'الرئيسية', mark: 'ر' },
  { href: '/branches', label: 'الفروع', mark: 'ف' },
  { href: '/warehouses', label: 'المخازن', mark: 'خ' },
  { href: '/items', label: 'المواد', mark: 'م' },
  { href: '/suppliers', label: 'الموردون', mark: 'و' },
  { href: '/purchase-invoices', label: 'فواتير الشراء', mark: 'ش' },
  { href: '/supplier-payments', label: 'دفعات الموردين', mark: 'د' },
  { href: '/expenses', label: 'المصاريف', mark: 'ص' },
  { href: '/expense-categories', label: 'أنواع المصاريف', mark: 'ن' },
  { href: '/expense-templates', label: 'قوالب المصاريف', mark: 'ل' },
  { href: '/daily-sales', label: 'المبيعات اليومية', mark: 'ي' },
  { href: '/transfers', label: 'التحويل بين الفروع', mark: 'ت' },
  { href: '/employees', label: 'الموظفون', mark: 'ظ' },
  { href: '/payroll', label: 'الرواتب', mark: 'ب' },
  { href: '/reports', label: 'التقارير', mark: 'ق' },
  { href: '/settings', label: 'الإعدادات', mark: 'ع' },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
        {navigationItems.map((item) => {
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
