import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { MonthSelect, YearSelect } from '../../components/month-year-selects';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import {
  currentPayrollPeriod,
  moneyValue,
  payrollStatusLabel,
  payrollStatusTone,
  sumEmployeeAdvances,
  sumEmployeePenalties,
} from '../../lib/payroll';
import type {
  BranchOption,
  EmployeeAdvanceSummary,
  EmployeePenaltySummary,
  EmployeeSummary,
  PayrollSummary,
} from '../../lib/types';

const columns: DataColumn<EmployeeSummary>[] = [
  { key: 'employeeNumber', label: 'رقم الموظف', render: (row) => row.employeeNumber },
  {
    key: 'fullName',
    label: 'الاسم',
    render: (row) => (
      <Link className="text-link" href={`/employees/${row.id}`}>
        {row.fullName}
      </Link>
    ),
  },
  { key: 'jobTitle', label: 'الوظيفة', render: (row) => row.jobTitle ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.defaultBranch?.name ?? 'بدون فرع' },
  { key: 'hireDate', label: 'تاريخ التعيين', render: (row) => (row.hireDate ? formatDate(row.hireDate) : 'غير محدد') },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/employees/${row.id}`}>
          الملف
        </Link>
        <Link className="text-link" href={`/employees/${row.id}/edit`}>
          تعديل
        </Link>
      </div>
    ),
  },
];

function PayrollStatusBadge({ status }: Readonly<{ status?: PayrollSummary['paymentStatus'] }>) {
  return <span className={`payroll-status ${payrollStatusTone(status)}`}>{payrollStatusLabel(status)}</span>;
}

function PayrollMiniAmount({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <span className="payroll-amount">
      <small>{label}</small>
      <strong>{formatMoney(value)}</strong>
    </span>
  );
}

function EmployeePayrollDetails({
  employee,
  payroll,
  advances,
  penalties,
  month,
  year,
}: Readonly<{
  employee: EmployeeSummary;
  payroll?: PayrollSummary;
  advances: EmployeeAdvanceSummary[];
  penalties: EmployeePenaltySummary[];
  month: string;
  year: string;
}>) {
  const pendingAdvances = sumEmployeeAdvances(advances, payroll?.id);
  const pendingPenalties = sumEmployeePenalties(penalties, payroll?.id);

  if (!payroll) {
    return (
      <div className="employee-payroll-empty">
        <span className="payroll-status muted">لا يوجد راتب مسجل</span>
        {pendingAdvances > 0 || pendingPenalties > 0 ? (
          <p>
            توجد خصومات للشهر المحدد: السلف {formatMoney(pendingAdvances)}، العقوبات {formatMoney(pendingPenalties)}.
          </p>
        ) : (
          <p>لا يوجد راتب مسجل لهذا الموظف في {month}/{year}.</p>
        )}
        <Link className="primary-button" href={`/payrolls/new?employee_id=${employee.id}&payroll_month=${month}&payroll_year=${year}`}>
          إنشاء راتب مقترح
        </Link>
      </div>
    );
  }

  const overtimeAmount = moneyValue(payroll.extraHoursAmount);
  const advancesAmount = moneyValue(payroll.advancesDeductionAmount);
  const penaltiesAmount = moneyValue(payroll.penaltiesDeductionAmount) + moneyValue(payroll.otherDeductionAmount);

  return (
    <div className="employee-payroll-detail">
      <div className="payroll-card-header">
        <div>
          <span>{payroll.payrollMode === 'hourly' ? 'نظام بالساعة' : 'راتب شهري ثابت'}</span>
          <h3>
            {payroll.payrollMonth}/{payroll.payrollYear}
          </h3>
        </div>
        <PayrollStatusBadge status={payroll.paymentStatus} />
      </div>
      {payroll.payrollMode === 'hourly' ? (
        <p className="field-hint">
          {moneyValue(payroll.workHours)} ساعة × {formatMoney(payroll.hourlyRate ?? 0)}
        </p>
      ) : null}
      {overtimeAmount > 0 ? (
        <p className="field-hint">
          ساعات إضافية: {moneyValue(payroll.extraHours)} ساعة × {formatMoney(payroll.extraHourRate ?? 0)}
        </p>
      ) : null}
      <div className="payroll-amount-grid">
        <PayrollMiniAmount label={payroll.payrollMode === 'hourly' ? 'أجر الساعات' : 'الراتب الأساسي'} value={moneyValue(payroll.baseSalary)} />
        {overtimeAmount > 0 ? <PayrollMiniAmount label="الساعات الإضافية" value={overtimeAmount} /> : null}
        {moneyValue(payroll.allowancesAmount) > 0 ? <PayrollMiniAmount label="البدلات" value={moneyValue(payroll.allowancesAmount)} /> : null}
        {advancesAmount > 0 ? <PayrollMiniAmount label="السلف" value={advancesAmount} /> : null}
        {penaltiesAmount > 0 ? <PayrollMiniAmount label="العقوبات والخصومات" value={penaltiesAmount} /> : null}
        <PayrollMiniAmount label="صافي الراتب" value={moneyValue(payroll.netSalary)} />
        <PayrollMiniAmount label="المدفوع" value={moneyValue(payroll.paidAmount)} />
        <PayrollMiniAmount label="المتبقي" value={moneyValue(payroll.remainingAmount)} />
      </div>
      <div className="inline-actions">
        <Link className="text-link" href={`/payrolls/${payroll.id}/edit`}>
          تعديل الراتب
        </Link>
      </div>
    </div>
  );
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const currentPeriod = currentPayrollPeriod();
  const selectedMonth = params.payroll_month ?? String(currentPeriod.month);
  const selectedYear = params.payroll_year ?? String(currentPeriod.year);

  const [employeesResult, branchesResult, payrollsResult, advancesResult, penaltiesResult] = await Promise.all([
    fetchList<EmployeeSummary>(`/employees${buildQuery({ search: params.search, branch_id: params.branch_id })}`),
    fetchList<BranchOption>('/branches'),
    fetchList<PayrollSummary>(`/payrolls${buildQuery({ payroll_month: selectedMonth, payroll_year: selectedYear })}`),
    fetchList<EmployeeAdvanceSummary>(`/employee-advances${buildQuery({ payroll_month: selectedMonth, payroll_year: selectedYear })}`),
    fetchList<EmployeePenaltySummary>(`/employee-penalties${buildQuery({ payroll_month: selectedMonth, payroll_year: selectedYear })}`),
  ]);
  const payrollByEmployee = new Map(payrollsResult.data.map((payroll) => [payroll.employeeId, payroll]));

  return (
    <>
      <PageHeader title="قائمة الموظفين" description="تابع بيانات الموظفين ورواتب الشهر المختار من مكان واحد." />
      <div className="page-toolbar">
        <AutoApplyFilterForm className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث بالاسم أو رقم الموظف أو الهاتف" />
          </label>
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            شهر الراتب
            <MonthSelect defaultValue={selectedMonth} name="payroll_month" />
          </label>
          <label>
            سنة الراتب
            <YearSelect defaultValue={selectedYear} name="payroll_year" />
          </label>
        </AutoApplyFilterForm>
        <Link className="primary-button" href="/employees/new">
          موظف جديد
        </Link>
      </div>
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {payrollsResult.error ?? advancesResult.error ?? penaltiesResult.error ? (
        <p className="notice">{payrollsResult.error ?? advancesResult.error ?? penaltiesResult.error}</p>
      ) : null}
      <DataTable
        columns={columns}
        rows={employeesResult.data}
        emptyTitle="لا يوجد موظفون"
        emptyText="أضف موظفًا جديدًا وسيظهر هنا."
      />

      <section className="employee-payroll-section">
        <div className="panel-heading">
          <div>
            <h3>رواتب الموظفين للشهر المحدد</h3>
            <span>
              {selectedMonth}/{selectedYear}
            </span>
          </div>
        </div>
        <div className="employee-payroll-list">
          {employeesResult.data.map((employee) => (
            <details className="employee-payroll-panel" key={employee.id}>
              <summary>
                <span>
                  <strong>{employee.fullName}</strong>
                  <small>{employee.employeeNumber}</small>
                </span>
                {payrollByEmployee.has(employee.id) ? (
                  <PayrollStatusBadge status={payrollByEmployee.get(employee.id)?.paymentStatus} />
                ) : (
                  <span className="payroll-status muted">لا يوجد راتب مسجل</span>
                )}
              </summary>
              <EmployeePayrollDetails
                employee={employee}
                payroll={payrollByEmployee.get(employee.id)}
                advances={advancesResult.data.filter((advance) => advance.employeeId === employee.id)}
                penalties={penaltiesResult.data.filter((penalty) => penalty.employeeId === employee.id)}
                month={selectedMonth}
                year={selectedYear}
              />
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
