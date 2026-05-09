import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DeleteFinancialRecordButton } from '../../components/delete-financial-record-button';
import { MonthSelect, YearSelect } from '../../components/month-year-selects';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { EmployeePenaltySummary, EmployeeSummary } from '../../lib/types';

const columns: DataColumn<EmployeePenaltySummary>[] = [
  { key: 'employee', label: 'الموظف', render: (row) => row.employee.fullName },
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.penaltyDate) },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'reason', label: 'السبب', render: (row) => row.reason ?? 'بدون سبب' },
  {
    key: 'period',
    label: 'فترة الراتب',
    render: (row) => (row.payrollMonth && row.payrollYear ? `${row.payrollMonth}/${row.payrollYear}` : 'غير مرتبط'),
  },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => <DeleteFinancialRecordButton path={`/employee-penalties/${row.id}`} reverse={false} label="حذف" />,
  },
];

export default async function EmployeePenaltiesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult] = await Promise.all([
    fetchList<EmployeePenaltySummary>(
      `/employee-penalties${buildQuery({
        search: params.search,
        employee_id: params.employee_id,
        payroll_month: params.payroll_month,
        payroll_year: params.payroll_year,
      })}`,
    ),
    fetchList<EmployeeSummary>('/employees'),
  ]);

  return (
    <>
      <PageHeader title="قائمة العقوبات" description="متابعة العقوبات المسجلة للموظفين وإعدادها للربط مع الرواتب لاحقا." />
      <div className="page-toolbar">
        <AutoApplyFilterForm className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث باسم الموظف أو السبب" />
          </label>
          <label>
            الموظف
            <select defaultValue={params.employee_id ?? ''} name="employee_id">
              <option value="">كل الموظفين</option>
              {employeesResult.data.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            الشهر
            <MonthSelect defaultValue={params.payroll_month} name="payroll_month" />
          </label>
          <label>
            السنة
            <YearSelect defaultValue={params.payroll_year} name="payroll_year" />
          </label>
        </AutoApplyFilterForm>
        <Link className="primary-button" href="/employee-penalties/new">
          إضافة عقوبة
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد عقوبات" emptyText="أضف عقوبة جديدة وستظهر هنا." />
    </>
  );
}
