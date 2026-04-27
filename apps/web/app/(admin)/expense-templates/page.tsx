import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';

type ExpenseTemplateRow = {
  id: string;
  name: string;
  branch?: { name: string } | null;
  expenseCategory?: { name: string } | null;
  defaultAmount: number;
  paymentMethod: string;
  isActive: boolean;
};

const columns: DataColumn<ExpenseTemplateRow>[] = [
  { key: 'name', label: 'القالب', render: (row) => row.name },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'كل الفروع' },
  { key: 'category', label: 'النوع', render: (row) => row.expenseCategory?.name ?? 'غير محدد' },
  { key: 'defaultAmount', label: 'المبلغ الافتراضي', render: (row) => formatMoney(row.defaultAmount) },
  { key: 'paymentMethod', label: 'طريقة الدفع', render: (row) => <StatusBadge value={row.paymentMethod} /> },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
];

export default async function ExpenseTemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<ExpenseTemplateRow>(
    `/expense-templates${buildQuery({ search: params.search, branch_id: params.branch_id })}`,
  );

  return (
    <>
      <PageHeader
        title="قوالب المصاريف"
        description="قوالب جاهزة لتكرار المصاريف الدورية بسرعة."
        actionLabel="قالب جديد"
      />
      <ListFilters searchPlaceholder="اسم القالب" showBranch />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد قوالب مصاريف"
        emptyText="ستساعد القوالب لاحقاً في إدخال المصاريف المتكررة بخطوات أقل."
      />
    </>
  );
}
