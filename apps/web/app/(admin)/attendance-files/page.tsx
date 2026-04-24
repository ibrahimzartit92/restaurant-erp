import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList } from '../../lib/api';
import type { AttendanceFileSummary, BranchOption, EmployeeSummary } from '../../lib/types';

const columns: DataColumn<AttendanceFileSummary>[] = [
  { key: 'employee', label: 'الموظف', render: (row) => row.employee?.fullName ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'period', label: 'الشهر/السنة', render: (row) => `${row.month}/${row.year}` },
  { key: 'fileName', label: 'اسم الملف', render: (row) => row.fileName },
  { key: 'fileType', label: 'النوع', render: (row) => row.fileType },
];

export default async function AttendanceFilesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult, branchesResult] = await Promise.all([
    fetchList<AttendanceFileSummary>(`/attendance-files${buildQuery({ search: params.search, employee_id: params.employee_id, branch_id: params.branch_id, month: params.month, year: params.year })}`),
    fetchList<EmployeeSummary>('/employees'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="قائمة ملفات البصمة" description="متابعة ملفات الحضور والبصمة المحفوظة للموظفين والفروع." />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label><input defaultValue={params.search ?? ''} name="search" placeholder="ابحث باسم الملف أو الموظف أو الفرع" /></label>
          <label>
            الموظف
            <select defaultValue={params.employee_id ?? ''} name="employee_id">
              <option value="">كل الموظفين</option>
              {employeesResult.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
          </label>
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label><input defaultValue={params.month ?? ''} max="12" min="1" name="month" placeholder="الشهر" type="number" /></label>
          <label><input defaultValue={params.year ?? ''} max="2100" min="2000" name="year" placeholder="السنة" type="number" /></label>
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/attendance-files/new">رفع ملف بصمة</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد ملفات بصمة" emptyText="ارفع ملف بصمة جديدًا وسيظهر هنا." />
    </>
  );
}
