import Link from 'next/link';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { buildQuery, fetchOne, formatDate, getMoneyFormatter } from '../../../lib/api';
import type { ReportColumn, ReportResult, ReportRow, ReportSummary } from '../../../lib/types';

type ReportPageProps = {
  params: Promise<{ key: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

const reportFilterHints: Record<string, { status?: string; paymentMethod?: string; needsSupplier?: boolean }> = {
  purchases: { status: 'draft / open / partially_paid / paid / cancelled' },
  'supplier-statement': { needsSupplier: true },
  'supplier-payments': { paymentMethod: 'cash / bank / other' },
  drawer: { status: 'open / closed' },
  'bank-transactions': { status: 'incoming / outgoing', paymentMethod: 'deposit / withdrawal / transfer' },
  'branch-transfers': { status: 'draft / completed / cancelled' },
  'stock-counts': { status: 'draft / completed / cancelled' },
  expenses: { paymentMethod: 'cash / bank / other' },
};

function reportQuery(params: Record<string, string | undefined>, format?: 'excel' | 'pdf') {
  return buildQuery({
    branch_id: params.branch_id,
    supplier_id: params.supplier_id,
    employee_id: params.employee_id,
    date_from: params.date_from,
    date_to: params.date_to,
    status: params.status,
    category_id: params.category_id,
    payment_method: params.payment_method,
    search: params.search,
    format,
  });
}

function renderValue(row: ReportRow, column: ReportColumn, formatMoney: (value?: number | string | null) => string) {
  const value = row[column.key];

  if (column.type === 'money') {
    return formatMoney(value);
  }

  if (column.type === 'date') {
    return formatDate(String(value ?? ''));
  }

  if (column.type === 'status') {
    return <StatusBadge value={String(value ?? '')} />;
  }

  return value ?? 'غير محدد';
}

function renderSummaryValue(summary: ReportSummary, formatMoney: (value?: number | string | null) => string) {
  if (summary.type === 'money') {
    return formatMoney(summary.value);
  }

  return summary.value;
}

export default async function ReportDetailsPage({ params, searchParams }: ReportPageProps) {
  const { key } = await params;
  const currentParams = (await searchParams) ?? {};
  const query = reportQuery(currentParams);
  const [result, formatMoney] = await Promise.all([
    fetchOne<ReportResult>(`/reports/${key}${query}`),
    getMoneyFormatter(),
  ]);
  const report = result.data;
  const hints = reportFilterHints[key] ?? {};

  if (!report) {
    return (
      <>
        <PageHeader title="التقرير غير متاح" description="تعذر تحميل التقرير المطلوب من الخادم." />
        {result.error ? <p className="notice danger">{result.error}</p> : null}
        <Link className="secondary-button" href="/reports">
          العودة لمركز التقارير
        </Link>
      </>
    );
  }

  const exportBase = `/api/reports/${key}/export`;

  return (
    <>
      <PageHeader title={report.title} description={report.description} />

      <section className="report-toolbar">
        <form className="filters report-filters" action="">
          <label>
            الفرع
            <input name="branch_id" placeholder="معرف الفرع" defaultValue={currentParams.branch_id ?? ''} />
          </label>
          <label>
            المورد
            <input
              name="supplier_id"
              placeholder={hints.needsSupplier ? 'مطلوب لكشف المورد' : 'معرف المورد'}
              defaultValue={currentParams.supplier_id ?? ''}
            />
          </label>
          <label>
            الموظف
            <input name="employee_id" placeholder="معرف الموظف" defaultValue={currentParams.employee_id ?? ''} />
          </label>
          <label>
            من تاريخ
            <input name="date_from" type="date" defaultValue={currentParams.date_from ?? ''} />
          </label>
          <label>
            إلى تاريخ
            <input name="date_to" type="date" defaultValue={currentParams.date_to ?? ''} />
          </label>
          <label>
            الحالة
            <input name="status" placeholder={hints.status ?? 'اختياري'} defaultValue={currentParams.status ?? ''} />
          </label>
          <label>
            التصنيف
            <input name="category_id" placeholder="معرف التصنيف" defaultValue={currentParams.category_id ?? ''} />
          </label>
          <label>
            طريقة الدفع / النوع
            <input
              name="payment_method"
              placeholder={hints.paymentMethod ?? 'اختياري'}
              defaultValue={currentParams.payment_method ?? ''}
            />
          </label>
          <button type="submit">تطبيق</button>
          <Link className="secondary-button" href={`/reports/${key}`}>
            مسح
          </Link>
        </form>
        <div className="report-export-actions">
          <a className="secondary-button" href={`${exportBase}${reportQuery(currentParams, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`${exportBase}${reportQuery(currentParams, 'pdf')}`}>
            PDF
          </a>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}

      <section className="summary-grid report-summary-grid">
        {report.summaries.map((summary) => (
          <div className="summary-card" key={summary.key}>
            <p>{summary.label}</p>
            <strong>{renderSummaryValue(summary, formatMoney)}</strong>
            <span>حسب الفلاتر الحالية</span>
          </div>
        ))}
      </section>

      {report.rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">+</div>
          <h3>لا توجد نتائج</h3>
          <p>غيّر الفلاتر أو أضف بيانات تشغيلية حتى تظهر نتائج التقرير هنا.</p>
        </div>
      ) : (
        <div className="table-wrap report-table-wrap">
          <table>
            <thead>
              <tr>
                {report.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={index}>
                  {report.columns.map((column) => (
                <td key={column.key}>{renderValue(row, column, formatMoney)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
