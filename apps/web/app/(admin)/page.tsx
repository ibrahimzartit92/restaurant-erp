import Link from 'next/link';
import { fetchList, formatMoney } from '../lib/api';

type ExpenseSummaryRow = { amount: number };
type DailySaleSummaryRow = {
  cashSalesAmount: number;
  bankSalesAmount: number;
  deliverySalesAmount: number;
  websiteSalesAmount: number;
  netSalesAmount: number;
};
type DrawerSessionSummaryRow = {
  calculatedBalance: number;
  differenceAmount: number;
  status: string;
};

const quickLinks = [
  { href: '/purchase-invoices', label: 'إضافة فاتورة شراء' },
  { href: '/supplier-payments', label: 'تسجيل دفعة مورد' },
  { href: '/items', label: 'مراجعة المواد' },
  { href: '/suppliers', label: 'متابعة الموردين' },
];

const adminQuickLinks = [
  { href: '/users', label: 'إدارة المستخدمين', note: 'عرض الحسابات وإضافة مستخدم جديد' },
  { href: '/roles', label: 'إدارة الأدوار', note: 'تنظيم الأدوار وربطها بالصلاحيات' },
  { href: '/permissions', label: 'إدارة الصلاحيات', note: 'مراجعة كتالوج الصلاحيات الحالي' },
];

export default async function DashboardPage() {
  const [expenses, dailySales, drawerSessions] = await Promise.all([
    fetchList<ExpenseSummaryRow>('/expenses'),
    fetchList<DailySaleSummaryRow>('/daily-sales'),
    fetchList<DrawerSessionSummaryRow>('/drawer-daily-sessions'),
  ]);

  const totalExpenses = expenses.data.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const totalDailySales = dailySales.data.reduce((sum, sale) => sum + Number(sale.netSalesAmount ?? 0), 0);
  const cashSales = dailySales.data.reduce((sum, sale) => sum + Number(sale.cashSalesAmount ?? 0), 0);
  const nonCashSales = dailySales.data.reduce(
    (sum, sale) =>
      sum +
      Number(sale.bankSalesAmount ?? 0) +
      Number(sale.deliverySalesAmount ?? 0) +
      Number(sale.websiteSalesAmount ?? 0),
    0,
  );
  const currentDrawerBalance = drawerSessions.data
    .filter((session) => session.status === 'open')
    .reduce((sum, session) => sum + Number(session.calculatedBalance ?? 0), 0);
  const drawerDifference = drawerSessions.data.reduce(
    (sum, session) => sum + Number(session.differenceAmount ?? 0),
    0,
  );

  const summaryCards = [
    { label: 'إجمالي المصاريف', value: formatMoney(totalExpenses), detail: 'من سجل المصاريف' },
    { label: 'إجمالي المبيعات اليومية', value: formatMoney(totalDailySales), detail: 'صافي المبيعات المسجلة' },
    { label: 'مبيعات نقدية', value: formatMoney(cashSales), detail: 'جاهزة للربط مع الدرج' },
    { label: 'مبيعات غير نقدية', value: formatMoney(nonCashSales), detail: 'بنكي وتوصيل وموقع' },
    { label: 'رصيد الدرج الحالي', value: formatMoney(currentDrawerBalance), detail: 'من الجلسات المفتوحة' },
    { label: 'مصاريف نقدية اليوم', value: formatMoney(0), detail: 'يربط لاحقاً بحركات الدرج' },
    { label: 'فرق الدرج', value: formatMoney(drawerDifference), detail: 'من جلسات الدرج' },
  ];

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">صباح العمل الهادئ</p>
          <h2>نظرة سريعة على تشغيل المطعم</h2>
          <p>هذه الصفحة مركز المتابعة اليومية للفروع والمخزون والمشتريات، ومنها يمكنك الآن الوصول أيضاً إلى إدارة المستخدمين والأدوار والصلاحيات.</p>
        </div>
        <div className="hero-note">
          <span>اليوم</span>
          <strong>جاهز للربط مع البيانات</strong>
        </div>
      </section>

      <section className="summary-grid" aria-label="ملخصات سريعة">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>مهام سريعة</h3>
            <span>روابط مباشرة</span>
          </div>
          <div className="quick-actions">
            {quickLinks.map((link) => (
              <Link className="quick-link-button" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>حالة النظام</h3>
            <span>تجريبي</span>
          </div>
          <ul className="timeline-list">
            <li>تم تجهيز واجهة الإدارة الأساسية.</li>
            <li>صفحات القوائم متصلة بنقاط النهاية المتاحة.</li>
            <li>قسم إدارة الوصول أصبح ظاهراً في القائمة الرئيسية ولوحة البداية.</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>إدارة الوصول</h3>
          <span>قسم الإدارة</span>
        </div>
        <div className="admin-shortcuts">
          {adminQuickLinks.map((link) => (
            <Link className="admin-shortcut-card" href={link.href} key={link.href}>
              <strong>{link.label}</strong>
              <span>{link.note}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
