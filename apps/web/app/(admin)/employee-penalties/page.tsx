import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { EmployeePenaltySummary, EmployeeSummary } from '../../lib/types';

const columns: DataColumn<EmployeePenaltySummary>[] = [
  { key: 'employee', label: 'الموظف', render: (row) => row.employee.fullName },
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.penaltyDate) },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'reason', label: 'السبب', render: (row) => row.reason ?? 'بدون سبب' },
  { key: 'period', label: 'فترة الراتب', render: (row) => row.payrollMonth && row.payrollYear ? `${row.payrollMonth}/${row.payrollYear}` : 'غير مرتبط' },
];

export default async function EmployeePenaltiesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult] = await Promise.all([
    fetchList<EmployeePenaltySummary>(`/employee-penalties${buildQuery({ search: params.search, employee_id: params.employee_id, payroll_month: params.payroll_month, payroll_year: params.payroll_year })}`),
    fetchList<EmployeeSummary>('/employees'),
  ]);

  return (
    <>
      <PageHeader title="قائمة العقوبات" description="متابعة العقوبات المسجلة للموظفين وإعدادها للربط مع الرواتب لاحقًا." />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label><input defaultValue={params.search ?? ''} name="search" placeholder="ابحث باسم الموظف أو السبب" /></label>
          <label>
            الموظف
            <select defaultValue={params.employee_id ?? ''} name="employee_id">
              <option value="">كل الموظفين</option>
              {employeesResult.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
          </label>
          <label><input defaultValue={params.payroll_month ?? ''} max="12" min="1" name="payroll_month" placeholder="الشهر" type="number" /></label>
          <label><input defaultValue={params.payroll_year ?? ''} max="2100" min="2000" name="payroll_year" placeholder="السنة" type="number" /></label>
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/employee-penalties/new">إضافة عقوبة</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد عقوبات" emptyText="أضف عقوبة جديدة وستظهر هنا." />
    </>
  );
}
