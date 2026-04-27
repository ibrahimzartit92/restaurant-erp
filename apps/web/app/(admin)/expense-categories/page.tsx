import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList } from '../../lib/api';

type ExpenseCategoryRow = {
  id: string;
  name: string;
  isFixed: boolean;
  notes?: string | null;
};

const columns: DataColumn<ExpenseCategoryRow>[] = [
  { key: 'name', label: 'الاسم', render: (row) => row.name },
  { key: 'isFixed', label: 'النوع', render: (row) => <StatusBadge value={row.isFixed ? 'ثابت' : 'متغير'} /> },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'لا توجد' },
];

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<ExpenseCategoryRow>(`/expense-categories${buildQuery({ search: params.search })}`);

  return (
    <>
      <PageHeader title="أنواع المصاريف" description="تصنيف المصاريف الثابتة والمتغيرة." actionLabel="نوع جديد" />
      <ListFilters searchPlaceholder="اسم النوع" />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد أنواع مصاريف"
        emptyText="أضف أنواع المصاريف مثل إيجار ورواتب وصيانة."
      />
    </>
  );
}
