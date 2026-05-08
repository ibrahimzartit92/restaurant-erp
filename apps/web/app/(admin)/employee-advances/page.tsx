import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DeleteFinancialRecordButton } from '../../components/delete-financial-record-button';
import { MonthSelect, YearSelect } from '../../components/month-year-selects';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { EmployeeAdvanceSummary, EmployeeSummary } from '../../lib/types';

const columns: DataColumn<EmployeeAdvanceSummary>[] = [
  { key: 'employee', label: 'الموظف', render: (row) => row.employee.fullName },
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.advanceDate) },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  {
    key: 'source',
    label: 'مصدر الدفع',
    render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? row.vault?.name ?? 'غير محدد',
  },
  {
    key: 'period',
    label: 'فترة الراتب',
    render: (row) => (row.payrollMonth && row.payrollYear ? `${row.payrollMonth}/${row.payrollYear}` : 'غير مرتبط'),
  },
  {
    key: 'settlement',
    label: 'حالة الخصم',
    render: (row) => (row.payrollRecordId ? 'مخصومة في راتب' : 'بانتظار راتب الشهر'),
  },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="inline-actions">
        <DeleteFinancialRecordButton path={`/employee-advances/${row.id}`} reverse={false} label="حذف فقط" />
        <DeleteFinancialRecordButton path={`/employee-advances/${row.id}`} reverse label="حذف وإرجاع للخزنة" />
      </div>
    ),
  },
];

export default async function EmployeeAdvancesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult] = await Promise.all([
    fetchList<EmployeeAdvanceSummary>(
      `/employee-advances${buildQuery({
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
      <PageHeader title="قائمة السلف" description="متابعة السلف المسجلة للموظفين وربطها لاحقا بالرواتب." />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث باسم الموظف أو رقمه" />
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
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/employee-advances/new">
          إضافة سلفة
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد سلف" emptyText="أضف سلفة جديدة وستظهر هنا." />
    </>
  );
}
