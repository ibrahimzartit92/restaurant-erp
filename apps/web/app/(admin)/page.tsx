import Link from 'next/link';
import { buildQuery, fetchList, fetchOne, formatDate, getMoneyFormatter } from '../lib/api';
import type { BranchOption } from '../lib/types';

type DashboardMetric = {
  key: string;
  label: string;
  value: number;
};

type DashboardPoint = {
  date: string;
  sales: number;
  purchases: number;
  operatingExpenses: number;
  miscellaneousExpenses: number;
  payroll: number;
  netAfterPurchases: number;
};

type DashboardOpenInvoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  branchName: string;
  invoiceDate: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
};

type DashboardResult = {
  filters: {
    branchId: string | null;
    period: string;
    dateFrom: string;
    dateTo: string;
  };
  metrics: DashboardMetric[];
  charts: {
    timeSeries: DashboardPoint[];
  };
  openInvoices: DashboardOpenInvoice[];
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const periodOptions = [
  { value: 'today', label: 'اليوم' },
  { value: 'this_week', label: 'هذا الأسبوع' },
  { value: 'this_month', label: 'هذا الشهر' },
  { value: 'this_year', label: 'هذه السنة' },
];

const kpiOrder = [
  { key: 'total_sales', label: 'إجمالي المبيعات' },
  { key: 'total_purchases', label: 'إجمالي المشتريات' },
  { key: 'total_operating_expenses', label: 'المصاريف التشغيلية' },
  { key: 'total_miscellaneous_expenses', label: 'المصاريف الإضافية' },
  { key: 'total_payroll', label: 'الرواتب' },
  { key: 'net_after_purchases', label: 'صافي الربح المبسط' },
  { key: 'bank_balance', label: 'الرصيد البنكي الحالي' },
  { key: 'vault_balance', label: 'رصيد الخزنة الحالي' },
];

function metricValue(metrics: DashboardMetric[], key: string) {
  return metrics.find((metric) => metric.key === key)?.value ?? 0;
}

function chartHeight(value: number, max: number) {
  if (max <= 0) return 4;
  return Math.max(4, Math.round((Math.abs(value) / max) * 160));
}

function expenseTotal(point: DashboardPoint) {
  return point.operatingExpenses + point.miscellaneousExpenses + point.payroll;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const query = buildQuery({
    branch_id: params.branch_id,
    period: params.period,
    date_from: params.date_from,
    date_to: params.date_to,
  });
  const [dashboardResult, branchesResult, formatMoney] = await Promise.all([
    fetchOne<DashboardResult>(`/dashboard${query}`),
    fetchList<BranchOption>('/branches'),
    getMoneyFormatter(),
  ]);
  const dashboard = dashboardResult.data;

  if (!dashboard) {
    return (
      <section className="dashboard-modern">
        <div className="empty-state polished-empty">
          <h2>تعذر تحميل لوحة التحكم</h2>
          <p>{dashboardResult.error ?? 'تحقق من تشغيل الخادم الخلفي ثم حاول مرة أخرى.'}</p>
        </div>
      </section>
    );
  }

  const exportQuery = buildQuery({
    branch_id: dashboard.filters.branchId ?? undefined,
    period: dashboard.filters.period,
    date_from: dashboard.filters.dateFrom,
    date_to: dashboard.filters.dateTo,
  });
  const pdfExportHref = `/api/dashboard/export${exportQuery}${exportQuery ? '&' : '?'}format=pdf`;
  const excelExportHref = `/api/dashboard/export${exportQuery}${exportQuery ? '&' : '?'}format=excel`;
  const maxChartValue = Math.max(
    ...dashboard.charts.timeSeries.flatMap((point) => [
      point.sales,
      point.purchases,
      expenseTotal(point),
      Math.abs(point.netAfterPurchases),
    ]),
    1,
  );

  return (
    <section className="dashboard-modern">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">نظرة إدارية</span>
          <h1>ملخص الأعمال</h1>
          <p>
            من {formatDate(dashboard.filters.dateFrom)} إلى {formatDate(dashboard.filters.dateTo)}
          </p>
        </div>
        <div className="dashboard-export-actions">
          <Link className="secondary-button" href={pdfExportHref}>
            تصدير PDF
          </Link>
          <Link className="secondary-button" href={excelExportHref}>
            تصدير Excel
          </Link>
        </div>
      </div>

      <form className="filter-toolbar dashboard-filter-toolbar">
        <label>
          الفرع
          <select name="branch_id" defaultValue={dashboard.filters.branchId ?? ''}>
            <option value="">كل الفروع</option>
            {branchesResult.data.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفترة
          <select name="period" defaultValue={dashboard.filters.period}>
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          من تاريخ
          <input name="date_from" type="date" defaultValue={dashboard.filters.dateFrom} />
        </label>
        <label>
          إلى تاريخ
          <input name="date_to" type="date" defaultValue={dashboard.filters.dateTo} />
        </label>
        <div className="filter-actions">
          <button type="submit">تطبيق</button>
          <Link className="secondary-button" href="/">
            إعادة ضبط
          </Link>
        </div>
      </form>

      <div className="modern-kpi-grid">
        {kpiOrder.map((item) => {
          const value = metricValue(dashboard.metrics, item.key);
          return (
            <article className={value < 0 ? 'modern-kpi-card danger' : 'modern-kpi-card'} key={item.key}>
              <span>{item.label}</span>
              <strong>{formatMoney(value)}</strong>
            </article>
          );
        })}
      </div>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">الحركة المالية</span>
            <h2>المبيعات والمشتريات والمصاريف والربح</h2>
          </div>
        </div>
        <div className="dashboard-chart" role="img" aria-label="رسم بياني للمبيعات والمشتريات والمصاريف والربح">
          {dashboard.charts.timeSeries.map((point) => (
            <div className="chart-bucket" key={point.date}>
              <div className="chart-bars">
                <span className="bar sales" style={{ height: chartHeight(point.sales, maxChartValue) }} title={`المبيعات ${formatMoney(point.sales)}`} />
                <span className="bar purchases" style={{ height: chartHeight(point.purchases, maxChartValue) }} title={`المشتريات ${formatMoney(point.purchases)}`} />
                <span className="bar expenses" style={{ height: chartHeight(expenseTotal(point), maxChartValue) }} title={`المصاريف ${formatMoney(expenseTotal(point))}`} />
                <span className="bar profit" style={{ height: chartHeight(point.netAfterPurchases, maxChartValue) }} title={`الربح ${formatMoney(point.netAfterPurchases)}`} />
              </div>
              <small>{point.date.slice(5)}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span className="legend sales">المبيعات</span>
          <span className="legend purchases">المشتريات</span>
          <span className="legend expenses">المصاريف</span>
          <span className="legend profit">الربح</span>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">جدول مختصر</span>
            <h2>ملخص الفترة حسب التاريخ</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المبيعات</th>
                <th>المشتريات</th>
                <th>المصاريف</th>
                <th>الرواتب</th>
                <th>الربح</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.charts.timeSeries.slice(-12).map((point) => (
                <tr key={point.date}>
                  <td>{formatDate(point.date)}</td>
                  <td>{formatMoney(point.sales)}</td>
                  <td>{formatMoney(point.purchases)}</td>
                  <td>{formatMoney(point.operatingExpenses + point.miscellaneousExpenses)}</td>
                  <td>{formatMoney(point.payroll)}</td>
                  <td>{formatMoney(point.netAfterPurchases)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">متابعة يومية</span>
            <h2>فواتير مشتريات مفتوحة</h2>
          </div>
          <Link className="secondary-button" href="/purchase-invoices?status=partially_paid">
            عرض الكل
          </Link>
        </div>
        {dashboard.openInvoices.length === 0 ? (
          <div className="empty-state polished-empty">
            <h3>لا توجد فواتير مفتوحة</h3>
            <p>كل فواتير المشتريات ضمن الفترة الحالية مسددة أو مغلقة.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>المورد</th>
                  <th>الفرع</th>
                  <th>التاريخ</th>
                  <th>الإجمالي</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.openInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/purchase-invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                    </td>
                    <td>{invoice.supplierName}</td>
                    <td>{invoice.branchName}</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{formatMoney(invoice.totalAmount)}</td>
                    <td>{formatMoney(invoice.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
