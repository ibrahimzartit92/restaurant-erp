import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, fetchOne, formatDate, getCurrencySettings } from '../../lib/api';
import type { BranchOption, ReportCatalogItem, ReportColumn, ReportResult, ReportRow, ReportSummary } from '../../lib/types';

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

const defaultReportKey = 'comprehensive';
const reportOrder = [
  'comprehensive',
  'expenses',
  'purchases',
  'wholesale-sales',
  'payroll',
  'financial-movements',
  'employee-obligations',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function periodRange(params: Record<string, string | undefined>) {
  const periodType = params.period_type ?? 'monthly';
  const anchor = params.period_anchor ? new Date(params.period_anchor) : new Date();
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;

  if (periodType === 'custom') {
    return { dateFrom: params.date_from, dateTo: params.date_to };
  }

  if (periodType === 'daily') return { dateFrom: iso(safeAnchor), dateTo: iso(safeAnchor) };
  if (periodType === 'weekly') return { dateFrom: iso(addDays(safeAnchor, -6)), dateTo: iso(safeAnchor) };
  if (periodType === 'quarterly') {
    const quarterStartMonth = Math.floor(safeAnchor.getMonth() / 3) * 3;
    return {
      dateFrom: iso(new Date(safeAnchor.getFullYear(), quarterStartMonth, 1)),
      dateTo: iso(new Date(safeAnchor.getFullYear(), quarterStartMonth + 3, 0)),
    };
  }
  if (periodType === 'half-yearly') {
    const startMonth = safeAnchor.getMonth() < 6 ? 0 : 6;
    return {
      dateFrom: iso(new Date(safeAnchor.getFullYear(), startMonth, 1)),
      dateTo: iso(new Date(safeAnchor.getFullYear(), startMonth + 6, 0)),
    };
  }
  if (periodType === 'yearly') {
    return {
      dateFrom: iso(new Date(safeAnchor.getFullYear(), 0, 1)),
      dateTo: iso(new Date(safeAnchor.getFullYear(), 11, 31)),
    };
  }

  return { dateFrom: iso(startOfMonth(safeAnchor)), dateTo: iso(endOfMonth(safeAnchor)) };
}

function selectedKeys(params: Record<string, string | undefined>, prefix: string, available: { key: string }[]) {
  const selected = Object.entries(params)
    .filter(([key, value]) => key.startsWith(prefix) && value === '1')
    .map(([key]) => key.slice(prefix.length));

  return selected.length ? selected : available.map((item) => item.key);
}

function reportQuery(params: Record<string, string | undefined>, report: ReportResult | null, format?: 'excel' | 'pdf') {
  const range = periodRange(params);
  const availableColumns = report?.availableColumns ?? report?.columns ?? [];
  const availableSummaries = report?.availableSummaries ?? report?.summaries ?? [];

  return buildQuery({
    branch_id: params.branch_id,
    employee_id: params.employee_id,
    supplier_id: params.supplier_id,
    status: params.status,
    payment_status: params.payment_status,
    search: params.search,
    date_from: range.dateFrom,
    date_to: range.dateTo,
    language: params.language ?? 'ar',
    column_keys: selectedKeys(params, 'column_', availableColumns).join(','),
    summary_keys: selectedKeys(params, 'summary_', availableSummaries).join(','),
    format,
  });
}

function sortReports(reports: ReportCatalogItem[]) {
  return [...reports].sort((first, second) => {
    const firstIndex = reportOrder.indexOf(first.key);
    const secondIndex = reportOrder.indexOf(second.key);
    return (firstIndex === -1 ? 999 : firstIndex) - (secondIndex === -1 ? 999 : secondIndex);
  });
}

function formatReportValue(
  row: ReportRow,
  column: ReportColumn,
  formatMoney: (value?: string | number | null) => string,
) {
  const value = row[column.key];
  if (column.type === 'money') return formatMoney(value);
  if (column.type === 'date') return formatDate(String(value ?? ''));
  return value ?? 'غير محدد';
}

function formatSummaryValue(summary: ReportSummary, formatMoney: (value?: string | number | null) => string) {
  return summary.type === 'money' ? formatMoney(summary.value) : summary.value;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) ?? {};
  const reportKey = params.report_type ?? defaultReportKey;
  const periodType = params.period_type ?? 'monthly';
  const language = params.language ?? 'ar';
  const query = reportQuery(params, null);
  const [catalogResult, branchesResult, reportResult, currencySettings] = await Promise.all([
    fetchList<ReportCatalogItem>('/reports'),
    fetchList<BranchOption>('/branches'),
    fetchOne<ReportResult>(`/reports/${reportKey}${query}`),
    getCurrencySettings(),
  ]);
  const report = reportResult.data;
  const exportQuery = reportQuery(params, report);
  const formatMoney = (value?: string | number | null) => {
    const numericValue = Number(value ?? 0);
    const locale = language === 'de' ? 'de-DE' : 'ar';
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: currencySettings.decimalPlaces,
      maximumFractionDigits: currencySettings.decimalPlaces,
    }).format(Number.isFinite(numericValue) ? numericValue : 0)} ${currencySettings.currencySymbol}`.trim();
  };
  const availableColumns = report?.availableColumns ?? report?.columns ?? [];
  const availableSummaries = report?.availableSummaries ?? report?.summaries ?? [];
  const activeColumns = new Set(selectedKeys(params, 'column_', availableColumns));
  const activeSummaries = new Set(selectedKeys(params, 'summary_', availableSummaries));

  return (
    <>
      <PageHeader
        title="مركز التقارير"
        description="صفحة مركزية لاختيار التقرير والفترة ولغة التصدير والحقول، مع معاينة مباشرة وتصدير موحد إلى PDF وExcel."
      />
      {catalogResult.error ? <p className="notice">{catalogResult.error}</p> : null}
      {branchesResult.error ? <p className="notice">{branchesResult.error}</p> : null}
      {reportResult.error ? <p className="notice danger">{reportResult.error}</p> : null}

      <section className="report-toolbar">
        <AutoApplyFilterForm className="filters report-filters">
          <label>
            نوع التقرير
            <select name="report_type" defaultValue={reportKey}>
              {sortReports(catalogResult.data).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            نوع الفترة
            <select name="period_type" defaultValue={periodType}>
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="half-yearly">نصف سنوي</option>
              <option value="yearly">سنوي</option>
              <option value="custom">نطاق مخصص</option>
            </select>
          </label>
          {periodType === 'custom' ? (
            <>
              <label>
                من تاريخ
                <input name="date_from" type="date" defaultValue={params.date_from ?? ''} />
              </label>
              <label>
                إلى تاريخ
                <input name="date_to" type="date" defaultValue={params.date_to ?? ''} />
              </label>
            </>
          ) : (
            <label>
              تاريخ مرجعي
              <input name="period_anchor" type="date" defaultValue={params.period_anchor ?? todayIso()} />
            </label>
          )}
          <label>
            لغة التصدير والمعاينة
            <select name="language" defaultValue={language}>
              <option value="ar">العربية</option>
              <option value="de">الألمانية</option>
            </select>
          </label>
          <label>
            الفرع
            <select name="branch_id" defaultValue={params.branch_id ?? ''}>
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            بحث
            <input name="search" type="search" defaultValue={params.search ?? ''} placeholder="مرجع أو وصف" />
          </label>
          <Link className="secondary-button" href="/reports">
            مسح
          </Link>
        </AutoApplyFilterForm>
      </section>

      {report ? (
        <>
          <section className="report-toolbar">
            <AutoApplyFilterForm className="filters report-filters">
              <input name="report_type" type="hidden" value={reportKey} />
              <input name="period_type" type="hidden" value={periodType} />
              <input name="period_anchor" type="hidden" value={params.period_anchor ?? todayIso()} />
              <input name="date_from" type="hidden" value={params.date_from ?? ''} />
              <input name="date_to" type="hidden" value={params.date_to ?? ''} />
              <input name="language" type="hidden" value={language} />
              <input name="branch_id" type="hidden" value={params.branch_id ?? ''} />
              <input name="search" type="hidden" value={params.search ?? ''} />
              <fieldset>
                <legend>ملخصات التقرير</legend>
                {availableSummaries.map((summary) => (
                  <label key={summary.key}>
                    <input
                      name={`summary_${summary.key}`}
                      type="checkbox"
                      value="1"
                      defaultChecked={activeSummaries.has(summary.key)}
                    />
                    {summary.label}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>أعمدة التفاصيل</legend>
                {availableColumns.map((column) => (
                  <label key={column.key}>
                    <input
                      name={`column_${column.key}`}
                      type="checkbox"
                      value="1"
                      defaultChecked={activeColumns.has(column.key)}
                    />
                    {column.label}
                  </label>
                ))}
              </fieldset>
            </AutoApplyFilterForm>
            <div className="report-export-actions">
              <a className="secondary-button" href={`/api/reports/${reportKey}/export${exportQuery}&format=excel`}>
                تصدير Excel
              </a>
              <a className="secondary-button" href={`/api/reports/${reportKey}/export${exportQuery}&format=pdf`}>
                تصدير PDF
              </a>
            </div>
          </section>

          <section className="summary-grid report-summary-grid">
            {report.summaries.map((summary) => (
              <div className="summary-card" key={summary.key}>
                <p>{summary.label}</p>
                <strong>{formatSummaryValue(summary, formatMoney)}</strong>
                <span>حسب الفلاتر الحالية</span>
              </div>
            ))}
          </section>

          {report.rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">+</div>
              <h3>لا توجد نتائج</h3>
              <p>غيّر الفترة أو الفلاتر حتى تظهر بيانات التقرير هنا.</p>
            </div>
          ) : (
            <div className="table-wrap report-table-wrap">
              <table dir={language === 'de' ? 'ltr' : 'rtl'}>
                <thead>
                  <tr>
                    {report.columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {report.columns.map((column) => (
                        <td key={column.key}>{formatReportValue(row, column, formatMoney)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
