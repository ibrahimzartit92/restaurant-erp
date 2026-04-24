import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate } from '../../lib/api';
import type { BranchOption, EmployeeSummary } from '../../lib/types';

const columns: DataColumn<EmployeeSummary>[] = [
  { key: 'employeeNumber', label: 'رقم الموظف', render: (row) => row.employeeNumber },
  { key: 'fullName', label: 'الاسم', render: (row) => row.fullName },
  { key: 'jobTitle', label: 'الوظيفة', render: (row) => row.jobTitle ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.defaultBranch?.name ?? 'بدون فرع' },
  { key: 'hireDate', label: 'تاريخ التعيين', render: (row) => (row.hireDate ? formatDate(row.hireDate) : 'غير محدد') },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/employees/${row.id}`}>التفاصيل</Link>
        <Link className="text-link" href={`/employees/${row.id}/edit`}>تعديل</Link>
      </div>
    ),
  },
];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [employeesResult, branchesResult] = await Promise.all([
    fetchList<EmployeeSummary>(`/employees${buildQuery({ search: params.search, branch_id: params.branch_id })}`),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="قائمة الموظفين" description="تابع بيانات الموظفين والفرع الافتراضي والحالة الوظيفية." />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث بالاسم أو رقم الموظف أو الهاتف" />
          </label>
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/employees/new">موظف جديد</Link>
      </div>
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      <DataTable columns={columns} rows={employeesResult.data} emptyTitle="لا يوجد موظفون" emptyText="أضف موظفًا جديدًا وسيظهر هنا." />
    </>
  );
}
