import Link from 'next/link';
import { BackendFallbackNote } from '../../components/backend-fallback-note';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList } from '../../lib/api';
import { mockRoles, withMockFallback } from '../../lib/access-control-mocks';
import type { RoleSummary } from '../../lib/types';

const columns: DataColumn<RoleSummary>[] = [
  { key: 'name', label: 'اسم الدور', render: (row) => row.name },
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
  { key: 'permissions', label: 'عدد الصلاحيات', render: (row) => String(row.permissions?.length ?? 0) },
  {
    key: 'edit',
    label: 'تعديل',
    render: (row) => (
      <Link className="text-link" href={`/roles/${row.id}/edit`}>
        تعديل
      </Link>
    ),
  },
  {
    key: 'assign',
    label: 'ربط الصلاحيات',
    render: (row) => (
      <Link className="text-link" href={`/roles/${row.id}/permissions`}>
        ربط الصلاحيات
      </Link>
    ),
  },
];

export default async function RolesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<RoleSummary>(`/roles${buildQuery({ search: params.search })}`);
  const rows = withMockFallback(result.data, mockRoles);

  return (
    <>
      <PageHeader title="قائمة الأدوار" description="أنشئ الأدوار وسمها بشكل واضح ثم اربطها بالصلاحيات المناسبة لكل قسم." />
      <div className="page-toolbar">
        <ListFilters searchPlaceholder="ابحث باسم الدور أو كوده" />
        <Link className="primary-button" href="/roles/new">
          إضافة دور
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      {result.data.length === 0 ? (
        <BackendFallbackNote message="تعذر تحميل الأدوار من الخادم، لذلك يتم عرض أمثلة جاهزة لتكتمل تجربة الواجهة." />
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="لا توجد أدوار"
        emptyText="أضف دوراً جديداً ثم اربطه بالصلاحيات المطلوبة قبل استخدامه مع المستخدمين."
      />
    </>
  );
}
