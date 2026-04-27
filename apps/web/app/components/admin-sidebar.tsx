'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { UserSummary } from '../lib/types';

type NavigationItem = {
  href: string;
  label: string;
  mark: string;
  permissionCodes?: string[];
  alwaysVisible?: boolean;
};

type NavigationSection = {
  id: string;
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    id: 'home',
    title: 'الرئيسية',
    items: [{ href: '/', label: 'الرئيسية', mark: 'ر', alwaysVisible: true }],
  },
  {
    id: 'daily-operations',
    title: 'التشغيل اليومي',
    items: [
      { href: '/daily-sales', label: 'المبيعات اليومية', mark: 'ي', permissionCodes: ['view_daily_sales'] },
      { href: '/expenses', label: 'المصاريف', mark: 'ص', permissionCodes: ['view_expenses'] },
      { href: '/drawers', label: 'الأدراج', mark: 'د', permissionCodes: ['view_drawers'] },
      { href: '/bank-accounts', label: 'الحسابات البنكية', mark: 'ب', alwaysVisible: true },
    ],
  },
  {
    id: 'purchasing',
    title: 'المشتريات',
    items: [
      { href: '/suppliers', label: 'الموردون', mark: 'م', permissionCodes: ['view_suppliers'] },
      { href: '/purchase-invoices', label: 'فواتير الشراء', mark: 'ف', permissionCodes: ['view_purchase_invoices'] },
      { href: '/supplier-payments', label: 'دفعات الموردين', mark: 'د', permissionCodes: ['view_supplier_payments'] },
    ],
  },
  {
    id: 'inventory',
    title: 'المخزون',
    items: [
      { href: '/items', label: 'المواد', mark: 'و', permissionCodes: ['view_items'] },
      { href: '/warehouses', label: 'المخازن', mark: 'خ', permissionCodes: ['view_warehouses'] },
      { href: '/transfers', label: 'التحويل بين الفروع', mark: 'ت' },
      { href: '/stock-counts', label: 'الجرد', mark: 'ج' },
    ],
  },
  {
    id: 'hr',
    title: 'الموارد البشرية',
    items: [
      { href: '/employees', label: 'الموظفون', mark: 'ظ' },
      { href: '/employee-advances', label: 'السلف', mark: 'س' },
      { href: '/employee-penalties', label: 'العقوبات', mark: 'ع' },
      { href: '/payroll', label: 'الرواتب', mark: 'ر' },
      { href: '/attendance-files', label: 'ملفات البصمة', mark: 'ب' },
    ],
  },
  {
    id: 'administration',
    title: 'الإدارة',
    items: [
      { href: '/branches', label: 'الفروع', mark: 'ف', permissionCodes: ['view_branches'] },
      { href: '/users', label: 'المستخدمون', mark: 'م', permissionCodes: ['view_users'], alwaysVisible: true },
      { href: '/roles', label: 'الأدوار', mark: 'د', permissionCodes: ['manage_roles'], alwaysVisible: true },
      { href: '/permissions', label: 'الصلاحيات', mark: 'ص', permissionCodes: ['manage_permissions'], alwaysVisible: true },
    ],
  },
  {
    id: 'reports',
    title: 'التقارير',
    items: [{ href: '/reports', label: 'التقارير', mark: 'ت', permissionCodes: ['view_reports'] }],
  },
  {
    id: 'settings',
    title: 'الإعدادات',
    items: [
      { href: '/settings', label: 'الإعدادات', mark: 'إ', permissionCodes: ['manage_settings'] },
      { href: '/expense-categories', label: 'أنواع المصاريف', mark: 'ن' },
      { href: '/expense-templates', label: 'قوالب المصاريف', mark: 'ق' },
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

function isItemActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function AdminSidebar({ currentUser }: Readonly<{ currentUser: UserSummary | null }>) {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');
  const [openSectionIds, setOpenSectionIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationSections.map((section) => [section.id, section.id === 'home'])),
  );

  const visibleSections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return navigationSections
      .map((section) => {
        const permittedItems = section.items.filter((item) => canSeeItem(item, currentUser));
        const filteredItems = normalizedSearch
          ? permittedItems.filter((item) => item.label.toLowerCase().includes(normalizedSearch))
          : permittedItems;

        return {
          ...section,
          items: filteredItems,
          hasActiveItem: permittedItems.some((item) => isItemActive(pathname, item.href)),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [currentUser, pathname, searchTerm]);

  useEffect(() => {
    setOpenSectionIds((currentState) => {
      const nextState = { ...currentState };

      for (const section of visibleSections) {
        if (section.hasActiveItem || searchTerm.trim()) {
          nextState[section.id] = true;
        } else if (!(section.id in nextState)) {
          nextState[section.id] = section.id === 'home';
        }
      }

      return nextState;
    });
  }, [pathname, searchTerm, visibleSections]);

  function toggleSection(sectionId: string) {
    setOpenSectionIds((currentState) => ({
      ...currentState,
      [sectionId]: !currentState[sectionId],
    }));
  }

  return (
    <aside className="admin-sidebar" aria-label="القائمة الرئيسية">
      <div className="brand-block">
        <div className="brand-logo">ERP</div>
        <div>
          <p className="brand-name">إدارة المطعم</p>
          <p className="brand-subtitle">لوحة التحكم</p>
        </div>
      </div>

      <div className="sidebar-search-shell">
        <span className="sidebar-search-icon">⌕</span>
        <input
          aria-label="بحث سريع في القائمة"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="بحث سريع في القائمة"
          type="search"
          value={searchTerm}
        />
      </div>

      <nav className="sidebar-nav">
        {visibleSections.map((section) => {
          const isOpen = openSectionIds[section.id] ?? section.hasActiveItem;

          return (
            <section className={`sidebar-group ${section.hasActiveItem ? 'active' : ''}`} key={section.id}>
              <button
                aria-expanded={isOpen}
                className={`sidebar-group-trigger ${section.hasActiveItem ? 'active' : ''}`}
                onClick={() => toggleSection(section.id)}
                type="button"
              >
                <span className="sidebar-group-copy">
                  <span className="sidebar-group-title">{section.title}</span>
                  <span className="sidebar-group-meta">{section.items.length} روابط</span>
                </span>
                <span className={`sidebar-group-chevron ${isOpen ? 'open' : ''}`}>‹</span>
              </button>

              {isOpen ? (
                <div className="sidebar-section-links">
                  {section.items.map((item) => {
                    const isActive = isItemActive(pathname, item.href);

                    return (
                      <Link className={`sidebar-link ${isActive ? 'active' : ''}`} href={item.href} key={item.href}>
                        <span className="sidebar-link-mark">{item.mark}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
