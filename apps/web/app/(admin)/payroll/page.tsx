import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import type { EmployeeSummary, PayrollSummary } from '../../lib/types';

const columns: DataColumn<PayrollSummary>[] = [
  { key: 'employee', label: 'الموظف', render: (row) => row.employee.fullName },
  { key: 'period', label: 'الشهر/السنة', render: (row) => `${row.payrollMonth}/${row.payrollYear}` },
  { key: 'base', label: 'الأساسي', render: (row) => formatMoney(row.baseSalary) },
  { key: 'allowances', label: 'البدلات', render: (row) => formatMoney(row.allowancesAmount) },
  { key: 'net', label: 'الصافي', render: (row) => formatMoney(row.netSalary) },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => <Link className="text-link" href={`/payroll/${row.id}/edit`}>تعديل</Link>,
  },
];

export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult] = await Promise.all([
    fetchList<PayrollSummary>(`/payrolls${buildQuery({ search: params.search, employee_id: params.employee_id, payroll_month: params.payroll_month, payroll_year: params.payroll_year })}`),
    fetchList<EmployeeSummary>('/employees'),
  ]);

  return (
    <>
      <PageHeader title="قائمة الرواتب" description="متابعة الرواتب الشهرية وصافي الراتب لكل موظف." />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label><input defaultValue={params.search ?? ''} name="search" placeholder="ابحث باسم الموظف أو رقمه" /></label>
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
        <Link className="primary-button" href="/payroll/new">إضافة راتب</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد رواتب" emptyText="أضف راتبًا جديدًا وسيظهر هنا." />
    </>
  );
}
