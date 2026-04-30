import Link from 'next/link';
import { DataTable, type DataColumn } from '../components/data-table';
import { StatusBadge } from '../components/status-badge';
import { buildQuery, fetchList, fetchOne, formatDate, getMoneyFormatter } from '../lib/api';
import type { BranchOption } from '../lib/types';

type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  changeAmount: number;
  changePercent: number | null;
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

type DashboardNamedValue = {
  label: string;
  value: number;
};

type DashboardOpenInvoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  branchName: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
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
  previousPeriod: {
    dateFrom: string;
    dateTo: string;
  };
  metrics: DashboardMetric[];
  charts: {
    timeSeries: DashboardPoint[];
    salesDistribution: DashboardNamedValue[];
    costStructure: DashboardNamedValue[];
    branchComparison: {
      branchId: string;
      branchName: string;
      sales: number;
      netAfterPurchases: number;
    }[];
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

const openInvoiceColumns = (formatMoney: (value?: number | string | null) => string): DataColumn<DashboardOpenInvoice>[] => [
  {
    key: 'invoiceNumber',
    label: 'الفاتورة',
    render: (row) => (
      <Link className="text-link" href={`/purchase-invoices/${row.id}`}>
        {row.invoiceNumber}
      </Link>
    ),
  },
  { key: 'supplierName', label: 'المورد', render: (row) => row.supplierName },
  { key: 'branchName', label: 'الفرع', render: (row) => row.branchName },
  { key: 'dueDate', label: 'الاستحقاق', render: (row) => (row.dueDate ? formatDate(row.dueDate) : 'بدون استحقاق') },
  { key: 'remainingAmount', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
];

function dashboardQuery(params: Record<string, string | undefined>, format?: 'excel' | 'pdf') {
  return buildQuery({
    branch_id: params.branch_id,
    period: params.period,
    date_from: params.date_from,
    date_to: params.date_to,
    format,
  });
}

function metricTone(metric: DashboardMetric) {
  if (metric.changeAmount > 0) return 'positive';
  if (metric.changeAmount < 0) return 'negative';
  return 'neutral';
}

function comparisonText(metric: DashboardMetric, formatMoney: (value?: number | string | null) => string) {
  const change = formatMoney(metric.changeAmount);
  const percent = metric.changePercent === null ? '' : ` (${metric.changePercent.toFixed(1)}%)`;
  return `${change}${percent} عن الفترة السابقة`;
}

function filteredQuery(dashboard: DashboardResult, extra: Record<string, string | undefined>) {
  return buildQuery({
    branch_id: dashboard.filters.branchId ?? undefined,
    date_from: dashboard.filters.dateFrom,
    date_to: dashboard.filters.dateTo,
    ...extra,
  });
}

function metricHref(metricKey: string, dashboard: DashboardResult) {
  switch (metricKey) {
    case 'total_sales':
      return `/daily-sales${filteredQuery(dashboard, {})}`;
    case 'total_purchases':
      return `/purchase-invoices${filteredQuery(dashboard, {
        invoice_date_from: dashboard.filters.dateFrom,
        invoice_date_to: dashboard.filters.dateTo,
        date_from: undefined,
        date_to: undefined,
      })}`;
    case 'total_operating_expenses':
      return `/expenses${filteredQuery(dashboard, { category_type: 'operating' })}`;
    case 'total_miscellaneous_expenses':
      return `/expenses${filteredQuery(dashboard, { category_type: 'miscellaneous' })}`;
    case 'total_payroll':
      return `/payrolls${buildQuery({ payroll_year: dashboard.filters.dateTo.slice(0, 4) })}`;
    case 'bank_balance':
      return '/bank-accounts';
    case 'supplier_due':
      return '/purchase-invoices?status=open';
    default:
      return null;
  }
}

function maxValue(values: number[]) {
  return Math.max(1, ...values.map((value) => Math.abs(value)));
}

function BarList({
  items,
  formatMoney,
}: Readonly<{
  items: DashboardNamedValue[];
  formatMoney: (value?: number | string | null) => string;
}>) {
  const max = maxValue(items.map((item) => item.value));

  return (
    <div className="dashboard-bar-list">
      {items.map((item) => (
        <div className="dashboard-bar-row" key={item.label}>
          <span>{item.label}</span>
          <div className="dashboard-bar-track">
            <i style={{ width: `${Math.max(4, (Math.abs(item.value) / max) * 100)}%` }} />
          </div>
          <strong>{formatMoney(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function TimeSeriesChart({
  points,
  formatMoney,
}: Readonly<{
  points: DashboardPoint[];
  formatMoney: (value?: number | string | null) => string;
}>) {
  const visiblePoints = points.slice(-18);
  const max = maxValue(
    visiblePoints.flatMap((point) => [
      point.sales,
      point.purchases,
      point.operatingExpenses,
      point.miscellaneousExpenses,
      point.payroll,
      point.netAfterPurchases,
    ]),
  );

  return (
    <div className="dashboard-timeseries">
      {visiblePoints.map((point) => (
        <div className="dashboard-timeseries-day" key={point.date}>
          <div className="dashboard-timeseries-bars" title={`${formatDate(point.date)} - ${formatMoney(point.netAfterPurchases)}`}>
            <i className="sales" style={{ height: `${Math.max(4, (Math.abs(point.sales) / max) * 100)}%` }} />
            <i className="purchases" style={{ height: `${Math.max(4, (Math.abs(point.purchases) / max) * 100)}%` }} />
            <i className="operating" style={{ height: `${Math.max(4, (Math.abs(point.operatingExpenses) / max) * 100)}%` }} />
            <i className="misc" style={{ height: `${Math.max(4, (Math.abs(point.miscellaneousExpenses) / max) * 100)}%` }} />
            <i className="payroll" style={{ height: `${Math.max(4, (Math.abs(point.payroll) / max) * 100)}%` }} />
            <i className="net" style={{ height: `${Math.max(4, (Math.abs(point.netAfterPurchases) / max) * 100)}%` }} />
          </div>
          <span>{point.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentParams = (await searchParams) ?? {};
  const query = dashboardQuery(currentParams);
  const [dashboardResult, branchesResult, formatMoney] = await Promise.all([
    fetchOne<DashboardResult>(`/dashboard${query}`),
    fetchList<BranchOption>('/branches'),
    getMoneyFormatter(),
  ]);
  const dashboard = dashboardResult.data;

  if (!dashboard) {
    return (
      <div className="dashboard-stack">
        <section className="dashboard-control-bar">
          <div className="dashboard-control-copy">
            <p className="eyebrow">لوحة الإدارة</p>
            <h2>تعذر تحميل لوحة الإدارة</h2>
            <p>{dashboardResult.error ?? 'الخادم غير متاح حاليا.'}</p>
          </div>
        </section>
      </div>
    );
  }

  const metricsByKey = new Map(dashboard.metrics.map((metric) => [metric.key, metric]));
  const exportBase = '/api/dashboard/export';

  return (
    <div className="dashboard-stack">
      <section className="dashboard-control-bar">
        <div className="dashboard-control-copy">
          <p className="eyebrow">لوحة الإدارة</p>
          <h2>ملخص مالي وتشغيلي عملي للمطعم</h2>
          <p>
            الفترة الحالية من {formatDate(dashboard.filters.dateFrom)} إلى {formatDate(dashboard.filters.dateTo)}، مع
            مقارنة تلقائية بالفترة السابقة من {formatDate(dashboard.previousPeriod.dateFrom)} إلى{' '}
            {formatDate(dashboard.previousPeriod.dateTo)}.
          </p>
        </div>

        <form action="" className="dashboard-toolbar-filters">
          <label>
            الفرع
            <select defaultValue={currentParams.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفترة السريعة
            <select defaultValue={currentParams.period ?? 'this_month'} name="period">
              {periodOptions.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input defaultValue={currentParams.date_from ?? ''} name="date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input defaultValue={currentParams.date_to ?? ''} name="date_to" type="date" />
          </label>
          <button type="submit">تطبيق</button>
          <Link className="secondary-button" href="/">
            إعادة ضبط
          </Link>
          <a className="secondary-button" href={`${exportBase}${dashboardQuery(currentParams, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`${exportBase}${dashboardQuery(currentParams, 'pdf')}`}>
            PDF
          </a>
        </form>
      </section>

      <section className="dashboard-kpis dashboard-kpis-management" aria-label="المؤشرات الرئيسية">
        {dashboard.metrics.map((metric) => {
          const href = metricHref(metric.key, dashboard);
          const className = `dashboard-kpi-card ${metricTone(metric)}`;
          const content = (
            <>
              <p>{metric.label}</p>
              <strong>{formatMoney(metric.value)}</strong>
              <span>{comparisonText(metric, formatMoney)}</span>
            </>
          );

          return href ? (
            <Link className={className} href={href} key={metric.key}>
              {content}
            </Link>
          ) : (
            <article className={className} key={metric.key}>
              {content}
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid dashboard-grid-primary">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <h3>الاتجاه اليومي</h3>
              <span>المبيعات، المشتريات، المصاريف، الرواتب، والصافي بعد المشتريات</span>
            </div>
          </div>
          <TimeSeriesChart points={dashboard.charts.timeSeries} formatMoney={formatMoney} />
          <div className="dashboard-chart-legend">
            <span className="sales">المبيعات</span>
            <span className="purchases">المشتريات</span>
            <span className="operating">تشغيلية</span>
            <span className="misc">متفرقات</span>
            <span className="payroll">رواتب</span>
            <span className="net">الصافي</span>
          </div>
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>توزيع المبيعات</h3>
            <span>حسب قناة التحصيل</span>
          </div>
          <BarList items={dashboard.charts.salesDistribution} formatMoney={formatMoney} />
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>هيكل التكلفة</h3>
            <span>المشتريات والمصاريف والرواتب</span>
          </div>
          <BarList items={dashboard.charts.costStructure} formatMoney={formatMoney} />
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>مقارنة الفروع</h3>
            <span>{dashboard.charts.branchComparison.length ? 'المبيعات والصافي بعد المشتريات' : 'تظهر عند عرض كل الفروع'}</span>
          </div>
          {dashboard.charts.branchComparison.length ? (
            <div className="dashboard-table-list">
              {dashboard.charts.branchComparison.map((branch) => (
                <div className="dashboard-table-row" key={branch.branchId}>
                  <div>
                    <strong>{branch.branchName}</strong>
                    <span>مبيعات {formatMoney(branch.sales)}</span>
                  </div>
                  <div>
                    <strong>{formatMoney(branch.netAfterPurchases)}</strong>
                    <span>الصافي بعد المشتريات</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline">اختر كل الفروع لعرض المقارنة.</div>
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>المعادلات المالية</h3>
            <span>تبسيط واضح لصافي التشغيل والصافي بعد المشتريات</span>
          </div>
          <div className="dashboard-formula-grid">
            <div>
              <span>صافي التشغيل</span>
              <strong>{formatMoney(metricsByKey.get('operating_net')?.value ?? 0)}</strong>
              <p>المبيعات - المصاريف التشغيلية - مصاريف المتفرقات - الرواتب</p>
            </div>
            <div>
              <span>الصافي بعد المشتريات</span>
              <strong>{formatMoney(metricsByKey.get('net_after_purchases')?.value ?? 0)}</strong>
              <p>المبيعات - المشتريات - المصاريف التشغيلية - مصاريف المتفرقات - الرواتب</p>
            </div>
          </div>
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading">
            <h3>مؤشرات متابعة</h3>
            <span>نقاط تحتاج مراجعة يومية</span>
          </div>
          <div className="dashboard-mini-grid">
            <Link className="mini-stat-card" href="/purchase-invoices?status=open">
              <span>الفواتير المفتوحة</span>
              <strong>{dashboard.openInvoices.length}</strong>
            </Link>
            <Link className="mini-stat-card" href="/purchase-invoices?status=open">
              <span>مستحقات الموردين</span>
              <strong>{formatMoney(metricsByKey.get('supplier_due')?.value ?? 0)}</strong>
            </Link>
            <Link className="mini-stat-card" href="/bank-accounts">
              <span>الرصيد البنكي الحالي</span>
              <strong>{formatMoney(metricsByKey.get('bank_balance')?.value ?? 0)}</strong>
            </Link>
          </div>
        </article>
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <h3>الفواتير المفتوحة</h3>
            <span>جدول مختصر للمستحقات التي تحتاج متابعة أو سداد</span>
          </div>
          <Link className="text-link" href="/purchase-invoices?status=open">
            عرض فواتير الشراء
          </Link>
        </div>
        <DataTable
          columns={openInvoiceColumns(formatMoney)}
          rows={dashboard.openInvoices}
          emptyTitle="لا توجد فواتير مفتوحة"
          emptyText="لا توجد مستحقات مورّدين مفتوحة ضمن التصفية الحالية."
        />
      </section>
    </div>
  );
}
