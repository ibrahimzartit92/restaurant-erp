import Link from 'next/link';
import { DailySalesClosingChangesButton } from '../../components/daily-sales-closing-changes-button';
import { DailySalesClosingDeleteButton } from '../../components/daily-sales-closing-delete-button';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type DailySaleClosingRow = {
  id: string;
  branch?: { name: string } | null;
  closingDate: string;
  status: 'draft' | 'finalized' | 'updated_after_close' | 'cancelled';
  handedCashAmount?: number;
  postCloseChanges?: {
    id?: string | null;
    operationType: string;
    actionType: 'created' | 'edited' | 'cancelled' | 'deleted';
    effectiveDate: string;
    recordedAt: string;
    amount?: number | null;
    reference?: string | null;
    operationId?: string | null;
  }[] | null;
  summaryValues?: {
    normalDailySalesAmount?: number;
    normalBankSalesAmount?: number;
    wholesaleCashCollections?: number;
    wholesaleBankCollections?: number;
    wholesaleCollectionsTotal?: number;
    expensesAmount?: number;
    purchasesAmount?: number;
    vaultTransferAmount?: number;
  } | null;
};

function closingStatusTone(status: DailySaleClosingRow['status']) {
  if (status === 'finalized' || status === 'updated_after_close') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'warning';
}

function closingStatusLabel(status: DailySaleClosingRow['status']) {
  if (status === 'finalized' || status === 'updated_after_close') return 'نهائي';
  if (status === 'cancelled') return 'ملغى';
  return 'مسودة';
}

const columns: DataColumn<DailySaleClosingRow>[] = [
  { key: 'closingDate', label: 'التاريخ', render: (row) => formatDate(row.closingDate) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  {
    key: 'status',
    label: 'الحالة',
    render: (row) => (
      <span className={`payroll-status ${closingStatusTone(row.status)}`}>
        {closingStatusLabel(row.status)}
      </span>
    ),
  },
  { key: 'normalSales', label: 'صافي المبيعات اليومية', render: (row) => formatMoney(row.summaryValues?.normalDailySalesAmount ?? 0) },
  { key: 'wholesale', label: 'تحصيلات الجملة', render: (row) => formatMoney(row.summaryValues?.wholesaleCollectionsTotal ?? 0) },
  { key: 'cash', label: 'المبلغ المستلم', render: (row) => formatMoney(row.handedCashAmount ?? 0) },
  { key: 'bankSales', label: 'المبيعات البنكية التشغيلية', render: (row) => formatMoney(row.summaryValues?.normalBankSalesAmount ?? 0) },
  { key: 'expenses', label: 'المصروفات', render: (row) => formatMoney(row.summaryValues?.expensesAmount ?? 0) },
  { key: 'purchases', label: 'المشتريات', render: (row) => formatMoney(row.summaryValues?.purchasesAmount ?? 0) },
  { key: 'vault', label: 'تحويل الخزنة', render: (row) => formatMoney(row.summaryValues?.vaultTransferAmount ?? 0) },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <span className="inline-actions">
        <Link className="text-link" href={`/daily-sales/${row.id}/edit`}>
          فتح المعالج
        </Link>
        {row.status === 'updated_after_close' || row.postCloseChanges?.length ? <DailySalesClosingChangesButton changes={row.postCloseChanges} /> : null}
        {row.status === 'draft' ? <DailySalesClosingDeleteButton closingId={row.id} /> : null}
      </span>
    ),
  },
];

export default async function DailySalesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const query = buildQuery({
    branch_id: params.branch_id,
    date_from: params.date_from,
    date_to: params.date_to,
    status: params.status,
  });
  const result = await fetchList<DailySaleClosingRow>(`/daily-sales${query}`);

  return (
    <>
      <PageHeader title="إقفالات المبيعات اليومية" description="مسودات وإقفالات الفروع اليومية مع فصل المبيعات التشغيلية عن تحصيلات الجملة." />
      <div className="page-toolbar">
        <ListFilters showBranch showDateRange />
        <div className="inline-actions">
          <Link className="secondary-button" href={`/api/daily-sales/export${query}${query ? '&' : '?'}format=pdf`}>
            تصدير PDF
          </Link>
          <Link className="secondary-button" href={`/api/daily-sales/export${query}${query ? '&' : '?'}format=excel`}>
            تصدير Excel
          </Link>
          <Link className="primary-button" href="/daily-sales/new">
            إقفال يومي جديد
          </Link>
        </div>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد إقفالات يومية"
        emptyText="ابدأ مسودة إقفال يومية لكل فرع وتاريخ، ثم أنهها بعد مراجعة المبيعات التشغيلية وتحصيلات الجملة."
      />
    </>
  );
}
