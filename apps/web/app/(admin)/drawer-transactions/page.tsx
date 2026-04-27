import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type DrawerTransactionRow = {
  id: string;
  drawer?: { name: string } | null;
  branch?: { name: string } | null;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
};

const columns: DataColumn<DrawerTransactionRow>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'drawer', label: 'الدرج', render: (row) => row.drawer?.name ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'type', label: 'نوع الحركة', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'direction', label: 'الاتجاه', render: (row) => row.direction === 'in' ? 'داخل' : 'خارج' },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'description', label: 'الوصف', render: (row) => row.description },
];

export default async function DrawerTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<DrawerTransactionRow>(
    `/drawer-transactions${buildQuery({
      branch_id: params.branch_id,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`,
  );

  return (
    <>
      <PageHeader title="حركات الدرج" description="كل حركة نقدية داخلة أو خارجة من الدرج." />
      <ListFilters showBranch showDateRange />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد حركات درج"
        emptyText="ستظهر هنا المبيعات النقدية والمصاريف والسحوبات والإيداعات عند تسجيلها."
      />
    </>
  );
}
