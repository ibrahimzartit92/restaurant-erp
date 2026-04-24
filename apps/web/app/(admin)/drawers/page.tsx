import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList } from '../../lib/api';

type DrawerRow = {
  id: string;
  code: string;
  name: string;
  branch?: { name: string } | null;
  isActive: boolean;
  notes?: string | null;
};

const columns: DataColumn<DrawerRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الدرج', render: (row) => row.name },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'لا توجد' },
];

export default async function DrawersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<DrawerRow>(
    `/drawers${buildQuery({ search: params.search, branch_id: params.branch_id })}`,
  );

  return (
    <>
      <PageHeader title="الأدراج" description="كل فرع يمتلك درجاً نقدياً واحداً في النسخة الأولى." />
      <ListFilters searchPlaceholder="اسم أو كود الدرج" showBranch />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد أدراج"
        emptyText="أضف درجاً لكل فرع حتى تبدأ جلسات النقد اليومية."
      />
    </>
  );
}
