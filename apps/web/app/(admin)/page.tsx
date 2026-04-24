import Link from 'next/link';
import { fetchList, formatMoney } from '../lib/api';
import type {
  BankAccountSummary,
  BankAccountTransactionSummary,
  BranchTransferSummary,
  StockCountSummary,
} from '../lib/types';

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
  const [expenses, dailySales, drawerSessions, bankAccounts, bankTransactions, transfers, stockCounts] =
    await Promise.all([
      fetchList<ExpenseSummaryRow>('/expenses'),
      fetchList<DailySaleSummaryRow>('/daily-sales'),
      fetchList<DrawerSessionSummaryRow>('/drawer-daily-sessions'),
      fetchList<BankAccountSummary>('/bank-accounts'),
      fetchList<BankAccountTransactionSummary>('/bank-account-transactions'),
      fetchList<BranchTransferSummary>('/transfers'),
      fetchList<StockCountSummary>('/stock-counts'),
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
  const totalBankBalance = bankAccounts.data.reduce((sum, account) => sum + Number(account.currentBalance ?? 0), 0);
  const totalDeposits = bankTransactions.data
    .filter((transaction) => transaction.transactionType === 'deposit')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const totalWithdrawals = bankTransactions.data
    .filter((transaction) => transaction.transactionType === 'withdrawal')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const totalBankTransfers = bankTransactions.data
    .filter((transaction) => transaction.transactionType === 'transfer')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const transfersCount = transfers.data.length;
  const transfersTotalCost = transfers.data.reduce((sum, transfer) => sum + Number(transfer.totalCostAmount ?? 0), 0);
  const stockCountsCount = stockCounts.data.length;
  const stockCountsQuantityDifference = stockCounts.data.reduce(
    (sum, stockCount) =>
      sum + stockCount.items.reduce((itemSum, item) => itemSum + Number(item.differenceQuantity ?? 0), 0),
    0,
  );
  const stockCountsCostDifference = stockCounts.data.reduce(
    (sum, stockCount) =>
      sum + stockCount.items.reduce((itemSum, item) => itemSum + Number(item.estimatedCostDifference ?? 0), 0),
    0,
  );

  const summaryCards = [
    { label: 'إجمالي المصاريف', value: formatMoney(totalExpenses), detail: 'من سجل المصاريف' },
    { label: 'إجمالي المبيعات اليومية', value: formatMoney(totalDailySales), detail: 'صافي المبيعات المسجلة' },
    { label: 'مبيعات نقدية', value: formatMoney(cashSales), detail: 'جاهزة للربط مع الدرج' },
    { label: 'مبيعات غير نقدية', value: formatMoney(nonCashSales), detail: 'بنكي وتوصيل وموقع' },
    { label: 'رصيد الدرج الحالي', value: formatMoney(currentDrawerBalance), detail: 'من الجلسات المفتوحة' },
    { label: 'فرق الدرج', value: formatMoney(drawerDifference), detail: 'من جلسات الدرج' },
    { label: 'إجمالي الرصيد البنكي', value: formatMoney(totalBankBalance), detail: 'من جميع الحسابات البنكية' },
    { label: 'إجمالي الإيداعات', value: formatMoney(totalDeposits), detail: 'من سجل حركات البنك' },
    { label: 'إجمالي السحوبات', value: formatMoney(totalWithdrawals), detail: 'من سجل حركات البنك' },
    { label: 'إجمالي التحويلات البنكية', value: formatMoney(totalBankTransfers), detail: 'من حركات نوع تحويل' },
    { label: 'عدد التحويلات', value: String(transfersCount), detail: 'تحويلات بين الفروع' },
    { label: 'إجمالي تكلفة التحويلات', value: formatMoney(transfersTotalCost), detail: 'قيمة المواد المحولة' },
    { label: 'عدد عمليات الجرد', value: String(stockCountsCount), detail: 'عمليات الجرد اليدوي' },
    { label: 'إجمالي فرق الكميات', value: stockCountsQuantityDifference.toFixed(3), detail: 'مجموع فروقات الجرد' },
    { label: 'إجمالي فرق التكلفة', value: formatMoney(stockCountsCostDifference), detail: 'فرق التكلفة التقديري' },
  ];

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">تشغيل اليوم</p>
          <h2>نظرة سريعة على عمل المطعم</h2>
          <p>
            هذه الصفحة تجمع أهم مؤشرات التشغيل اليومية، وتمنحك وصولًا سريعًا إلى الإدارة المالية والبنوك
            والتحويلات بين الفروع والجرد اليدوي وإدارة المستخدمين والصلاحيات.
          </p>
        </div>
        <div className="hero-note">
          <span>الحالة</span>
          <strong>جاهز للتوسع وربط البيانات</strong>
        </div>
      </section>

      <section aria-label="ملخصات سريعة" className="summary-grid">
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
            <span>ملخص</span>
          </div>
          <ul className="timeline-list">
            <li>واجهة الإدارة الأساسية تعمل داخل تخطيط عربي RTL موحد.</li>
            <li>الأقسام المالية والبنكية والتحويلات والجرد جاهزة للتطوير التدريجي.</li>
            <li>إدارة المستخدمين والأدوار والصلاحيات متاحة من الواجهة.</li>
          </ul>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
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
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>البنوك</h3>
            <span>حركات وأرصدة</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/bank-accounts">
              الحسابات البنكية
            </Link>
            <Link className="quick-link-button" href="/bank-account-transactions">
              حركات البنك
            </Link>
            <Link className="quick-link-button" href="/bank-accounts/new">
              إضافة حساب بنكي
            </Link>
            <Link className="quick-link-button" href="/bank-account-transactions/new">
              إضافة حركة بنكية
            </Link>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>التحويل بين الفروع</h3>
            <span>مواد وتكلفة</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/transfers">
              قائمة التحويلات
            </Link>
            <Link className="quick-link-button" href="/transfers/new">
              إضافة تحويل جديد
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>الجرد اليدوي</h3>
            <span>مخزون وفروقات</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/stock-counts">
              قائمة الجرد
            </Link>
            <Link className="quick-link-button" href="/stock-counts/new">
              إضافة جرد جديد
            </Link>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>ملاحظات التشغيل</h3>
            <span>تحويلات الفروع</span>
          </div>
          <ul className="timeline-list">
            <li>التحويل الحالي يسجل حركة مواد بين فرع مصدر وفرع مستهدف.</li>
            <li>التأثير المخزني جاهز للإضافة لاحقًا دون تغيير الواجهة الأساسية.</li>
            <li>تفاصيل التحويل تعرض المواد والكميات والتكلفة وتدعم التوسعة للطباعة مستقبلًا.</li>
          </ul>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>ملاحظات الجرد</h3>
            <span>المخزون</span>
          </div>
          <ul className="timeline-list">
            <li>الجرد الحالي يدوي ويسجل كمية النظام وكمية العد لكل مادة.</li>
            <li>فرق الكمية وفرق التكلفة يحسبان مباشرة داخل السطور.</li>
            <li>الهيكل جاهز لاحقًا لربط التسويات والتحليل بين المشتريات والمبيعات والهدر.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
