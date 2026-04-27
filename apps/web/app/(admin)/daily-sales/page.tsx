import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type DailySaleRow = {
  id: string;
  branch?: { name: string } | null;
  salesDate: string;
  cashSalesAmount: number;
  bankSalesAmount: number;
  deliverySalesAmount: number;
  websiteSalesAmount: number;
  salesReturnAmount: number;
  netSalesAmount: number;
};

const columns: DataColumn<DailySaleRow>[] = [
  { key: 'salesDate', label: 'التاريخ', render: (row) => formatDate(row.salesDate) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'cash', label: 'نقدية', render: (row) => formatMoney(row.cashSalesAmount) },
  { key: 'bank', label: 'بنكية', render: (row) => formatMoney(row.bankSalesAmount) },
  { key: 'delivery', label: 'توصيل', render: (row) => formatMoney(row.deliverySalesAmount) },
  { key: 'website', label: 'موقع', render: (row) => formatMoney(row.websiteSalesAmount) },
  { key: 'returns', label: 'مرتجعات', render: (row) => formatMoney(row.salesReturnAmount) },
  { key: 'net', label: 'الصافي', render: (row) => formatMoney(row.netSalesAmount) },
  { key: 'actions', label: 'إجراء', render: (row) => <Link className="text-link" href={`/daily-sales/${row.id}/edit`}>تعديل</Link> },
];

export default async function DailySalesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<DailySaleRow>(
    `/daily-sales${buildQuery({
      branch_id: params.branch_id,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`,
  );

  return (
    <>
      <PageHeader title="المبيعات اليومية" description="تسجيل مبيعات الفروع اليومية وحساب صافي المبيعات." />
      <div className="page-toolbar">
        <ListFilters showBranch showDateRange />
        <Link className="primary-button" href="/daily-sales/new">مبيعات يومية جديدة</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد مبيعات يومية"
        emptyText="أضف سجل مبيعات يومية لكل فرع وتاريخ."
      />
    </>
  );
}
