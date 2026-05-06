import Link from 'next/link';
import type { CSSProperties } from 'react';
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
  paidSupplierAmounts: number;
  outstandingSupplierAmounts: number;
  operatingExpenses: number;
  miscellaneousExpenses: number;
  payroll: number;
  outstandingPayroll: number;
  employeeAdvances: number;
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
  { key: 'paid_supplier_amounts', label: 'المدفوع للموردين' },
  { key: 'supplier_due', label: 'مستحقات الموردين' },
  { key: 'outstanding_payroll', label: 'مستحقات الرواتب' },
  { key: 'total_sales', label: 'إجمالي المبيعات' },
  { key: 'total_purchases', label: 'إجمالي المشتريات' },
  { key: 'total_operating_expenses', label: 'المصاريف التشغيلية' },
  { key: 'total_miscellaneous_expenses', label: 'المصاريف الإضافية' },
  { key: 'total_employee_advances', label: 'سلف الموظفين' },
  { key: 'total_payroll', label: 'الرواتب' },
  { key: 'net_after_purchases', label: 'صافي الربح المبسط' },
  { key: 'bank_balance', label: 'الرصيد البنكي الحالي' },
  { key: 'vault_balance', label: 'رصيد الخزنة الحالي' },
];

const chartSeries = [
  { key: 'sales', label: 'المبيعات', color: '#14746f' },
  { key: 'purchases', label: 'المشتريات', color: '#2563eb' },
  { key: 'expenses', label: 'المصاريف', color: '#b45309' },
  { key: 'employeeAdvances', label: 'سلف الموظفين', color: '#7c3aed' },
  { key: 'profit', label: 'الربح', color: '#0f9f6e' },
] as const;

function metricValue(metrics: DashboardMetric[], key: string) {
  return metrics.find((metric) => metric.key === key)?.value ?? 0;
}

function hasMetric(metrics: DashboardMetric[], key: string) {
  return metrics.some((metric) => metric.key === key);
}

function expenseTotal(point: DashboardPoint) {
  return point.operatingExpenses + point.miscellaneousExpenses + point.payroll;
}

function pointValue(point: DashboardPoint, key: (typeof chartSeries)[number]['key']) {
  if (key === 'expenses') return expenseTotal(point);
  if (key === 'profit') return point.netAfterPurchases;
  return point[key];
}

function buildLinePath(values: number[], max: number, width: number, height: number) {
  if (!values.length) return '';
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (Math.max(value, 0) / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildAreaPath(values: number[], max: number, width: number, height: number) {
  const line = buildLinePath(values, max, width, height);
  if (!line) return '';
  return `${line} L ${width} ${height} L 0 ${height} Z`;
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
  const visibleKpis = kpiOrder.filter((item) => item.key !== 'total_payroll' || hasMetric(dashboard.metrics, 'total_payroll'));
  const width = 960;
  const height = 260;
  const maxChartValue = Math.max(
    ...dashboard.charts.timeSeries.flatMap((point) => chartSeries.map((series) => Math.max(pointValue(point, series.key), 0))),
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
          <button className="dashboard-apply-button" type="submit">تطبيق</button>
          <Link className="secondary-button dashboard-reset-button" href="/">
            إعادة ضبط
          </Link>
        </div>
      </form>

      <div className="modern-kpi-grid">
        {visibleKpis.map((item) => {
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
            <h2>اتجاه المبيعات والمشتريات والمصاريف والربح</h2>
          </div>
        </div>
        <div className="dashboard-line-chart" role="img" aria-label="رسم خطي للمبيعات والمشتريات والمصاريف والربح وسلف الموظفين">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#14746f" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#14746f" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path
              d={buildAreaPath(dashboard.charts.timeSeries.map((point) => point.sales), maxChartValue, width, height)}
              fill="url(#sales-area)"
            />
            {chartSeries.map((series) => (
              <path
                key={series.key}
                d={buildLinePath(
                  dashboard.charts.timeSeries.map((point) => pointValue(point, series.key)),
                  maxChartValue,
                  width,
                  height,
                )}
                fill="none"
                stroke={series.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={series.key === 'profit' ? 4 : 3}
              />
            ))}
          </svg>
        </div>
        <div className="chart-legend">
          {chartSeries.map((series) => (
            <span className="legend" key={series.key} style={{ '--legend-color': series.color } as CSSProperties}>
              {series.label}
            </span>
          ))}
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
                {hasMetric(dashboard.metrics, 'total_payroll') ? <th>الرواتب</th> : null}
                <th>سلف الموظفين</th>
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
                  {hasMetric(dashboard.metrics, 'total_payroll') ? <td>{formatMoney(point.payroll)}</td> : null}
                  <td>{formatMoney(point.employeeAdvances)}</td>
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
