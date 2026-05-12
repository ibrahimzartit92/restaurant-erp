import Link from 'next/link';
import { DailySalesClosingDeleteButton } from '../../components/daily-sales-closing-delete-button';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type DailySaleClosingRow = {
  id: string;
  branch?: { name: string } | null;
  closingDate: string;
  status: 'draft' | 'finalized' | 'cancelled';
  handedCashAmount?: number;
  cashDifferenceAmount?: number;
  summaryValues?: {
    deliverySalesAmount?: number;
    websiteCashSales?: number;
    websiteBankSalesAmount?: number;
    wholesaleCashCollections?: number;
    vaultTransferAmount?: number;
  } | null;
};

const columns: DataColumn<DailySaleClosingRow>[] = [
  { key: 'closingDate', label: 'التاريخ', render: (row) => formatDate(row.closingDate) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  {
    key: 'status',
    label: 'الحالة',
    render: (row) => (
      <span className={`payroll-status ${row.status === 'finalized' ? 'success' : row.status === 'cancelled' ? 'danger' : 'warning'}`}>
        {row.status === 'finalized' ? 'منتهي' : row.status === 'cancelled' ? 'ملغى' : 'مسودة'}
      </span>
    ),
  },
  { key: 'delivery', label: 'توصيل', render: (row) => formatMoney(row.summaryValues?.deliverySalesAmount ?? 0) },
  {
    key: 'website',
    label: 'موقع',
    render: (row) => formatMoney(Number(row.summaryValues?.websiteCashSales ?? 0) + Number(row.summaryValues?.websiteBankSalesAmount ?? 0)),
  },
  { key: 'wholesale', label: 'جملة نقدي', render: (row) => formatMoney(row.summaryValues?.wholesaleCashCollections ?? 0) },
  { key: 'cash', label: 'النقد المسلم', render: (row) => formatMoney(row.handedCashAmount ?? 0) },
  { key: 'difference', label: 'الفرق', render: (row) => formatMoney(row.cashDifferenceAmount ?? 0) },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <span className="inline-actions">
        <Link className="text-link" href={`/daily-sales/${row.id}/edit`}>فتح المعالج</Link>
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
  const result = await fetchList<DailySaleClosingRow>(
    `/daily-sales${buildQuery({
      branch_id: params.branch_id,
      date_from: params.date_from,
      date_to: params.date_to,
      status: params.status,
    })}`,
  );

  return (
    <>
      <PageHeader title="إقفالات المبيعات اليومية" description="مسودات وإقفالات الفروع اليومية مع التسوية النقدية والتحويلات." />
      <div className="page-toolbar">
        <ListFilters showBranch showDateRange />
        <div className="inline-actions">
          <Link className="primary-button" href="/daily-sales/new">إقفال يومي جديد</Link>
        </div>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد إقفالات يومية"
        emptyText="ابدأ مسودة إقفال يومية لكل فرع وتاريخ، ثم أنهها عند مراجعة القيم."
      />
    </>
  );
}
