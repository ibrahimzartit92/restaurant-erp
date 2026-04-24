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

const quickLinks = ['إضافة فاتورة شراء', 'تسجيل دفعة مورد', 'مراجعة المواد', 'متابعة الموردين'];

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
          <p>هذه الصفحة ستكون مركز المتابعة اليومي للفروع والمخزون والمشتريات والمدفوعات.</p>
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
            <span>قريباً</span>
          </div>
          <div className="quick-actions">
            {quickLinks.map((link) => (
              <button key={link}>{link}</button>
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
            <li>النماذج والصلاحيات ستضاف في المراحل التالية.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
