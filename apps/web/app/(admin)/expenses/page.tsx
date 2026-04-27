import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type ExpenseRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  branch?: { name: string } | null;
  expenseCategory?: { name: string } | null;
  title: string;
  amount: number;
  paymentMethod: string;
  isFixed: boolean;
};

const columns: DataColumn<ExpenseRow>[] = [
  { key: 'expenseNumber', label: 'رقم المصروف', render: (row) => row.expenseNumber },
  { key: 'expenseDate', label: 'التاريخ', render: (row) => formatDate(row.expenseDate) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'category', label: 'النوع', render: (row) => row.expenseCategory?.name ?? 'غير محدد' },
  { key: 'title', label: 'العنوان', render: (row) => row.title },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'paymentMethod', label: 'الدفع', render: (row) => <StatusBadge value={row.paymentMethod} /> },
  { key: 'isFixed', label: 'التكرار', render: (row) => (row.isFixed ? 'ثابت' : 'متغير') },
  { key: 'actions', label: 'إجراء', render: (row) => <Link className="text-link" href={`/expenses/${row.id}/edit`}>تعديل</Link> },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<ExpenseRow>(
    `/expenses${buildQuery({
      search: params.search,
      branch_id: params.branch_id,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`,
  );

  return (
    <>
      <PageHeader title="المصاريف" description="تسجيل ومراجعة مصاريف التشغيل اليومية والثابتة." />
      <div className="page-toolbar">
        <ListFilters searchPlaceholder="رقم أو عنوان المصروف" showBranch showDateRange />
        <Link className="primary-button" href="/expenses/new">مصروف جديد</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد مصاريف"
        emptyText="عند تسجيل مصروف جديد سيظهر في هذه القائمة."
      />
    </>
  );
}
