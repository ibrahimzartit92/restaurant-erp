import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate } from '../../lib/api';
import type { UserSummary } from '../../lib/types';

const columns: DataColumn<UserSummary>[] = [
  { key: 'fullName', label: 'الاسم', render: (row) => row.fullName },
  { key: 'username', label: 'اسم المستخدم', render: (row) => row.username },
  { key: 'email', label: 'البريد الإلكتروني', render: (row) => row.email ?? 'غير محدد' },
  { key: 'role', label: 'الدور', render: (row) => row.role.name },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'جميع الفروع' },
  { key: 'branchAccess', label: 'نطاق الفروع', render: (row) => <StatusBadge value={row.branchAccess.scope === 'all' ? 'all_branches' : 'single_branch'} /> },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'createdAt', label: 'تاريخ الإضافة', render: (row) => formatDate(row.createdAt) },
  { key: 'actions', label: 'إجراء', render: (row) => <Link className="text-link" href={`/users/${row.id}/edit`}>تعديل</Link> },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<UserSummary>(`/users${buildQuery({ search: params.search })}`);

  return (
    <>
      <PageHeader title="قائمة المستخدمين" description="إدارة حسابات الموظفين وربطهم بالأدوار والفروع من نفس لوحة الإدارة." />
      <div className="page-toolbar">
        <ListFilters searchPlaceholder="ابحث بالاسم أو اسم المستخدم أو البريد الإلكتروني" />
        <Link className="primary-button" href="/users/new">
          إضافة مستخدم
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا يوجد مستخدمون"
        emptyText="عند إضافة مستخدم جديد سيظهر هنا مع دوره ونطاق الفروع الخاص به."
      />
    </>
  );
}
