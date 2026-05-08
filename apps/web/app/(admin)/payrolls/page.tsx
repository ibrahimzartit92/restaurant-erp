import Link from 'next/link';
import { DeleteFinancialRecordButton } from '../../components/delete-financial-record-button';
import { MonthSelect, YearSelect } from '../../components/month-year-selects';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import {
  currentPayrollPeriod,
  moneyValue,
  payrollGrossAmount,
  payrollStatusLabel,
  payrollStatusTone,
} from '../../lib/payroll';
import type { EmployeeSummary, PayrollSummary } from '../../lib/types';

type PayrollFilterStatus = NonNullable<PayrollSummary['paymentStatus']> | 'no_record' | '';

function PayrollStatus({ status = 'unpaid' }: Readonly<{ status?: PayrollSummary['paymentStatus'] }>) {
  return <span className={`payroll-status ${payrollStatusTone(status)}`}>{payrollStatusLabel(status)}</span>;
}

function PayrollAmount({
  label,
  value,
  tone = 'neutral',
}: Readonly<{
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'highlight';
}>) {
  return (
    <span className={`payroll-amount ${tone}`}>
      <small>{label}</small>
      <strong>{formatMoney(value)}</strong>
    </span>
  );
}

function PayrollDetails({ row }: Readonly<{ row: PayrollSummary }>) {
  const overtimeAmount = moneyValue(row.extraHoursAmount);
  const advancesAmount = moneyValue(row.advancesDeductionAmount);
  const penaltiesAmount = moneyValue(row.penaltiesDeductionAmount) + moneyValue(row.otherDeductionAmount);

  return (
    <div className="payroll-amount-grid">
      <PayrollAmount
        label={row.payrollMode === 'hourly' ? 'أجر الساعات' : 'الراتب الأساسي'}
        value={moneyValue(row.baseSalary)}
      />
      {overtimeAmount > 0 ? <PayrollAmount label="الساعات الإضافية" value={overtimeAmount} tone="success" /> : null}
      {moneyValue(row.allowancesAmount) > 0 ? <PayrollAmount label="البدلات" value={moneyValue(row.allowancesAmount)} tone="success" /> : null}
      {advancesAmount > 0 ? <PayrollAmount label="السلف" value={advancesAmount} tone="warning" /> : null}
      {penaltiesAmount > 0 ? <PayrollAmount label="العقوبات والخصومات" value={penaltiesAmount} tone="danger" /> : null}
      <PayrollAmount label="إجمالي الراتب" value={payrollGrossAmount(row)} />
      <PayrollAmount label="صافي الراتب" value={moneyValue(row.netSalary)} />
      <PayrollAmount label="المدفوع" value={moneyValue(row.paidAmount)} tone="success" />
      <PayrollAmount label="المتبقي" value={moneyValue(row.remainingAmount)} tone="highlight" />
    </div>
  );
}

export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const currentPeriod = currentPayrollPeriod();
  const selectedMonth = params.payroll_month ?? String(currentPeriod.month);
  const selectedYear = params.payroll_year ?? String(currentPeriod.year);
  const selectedStatus = (params.payment_status ?? '') as PayrollFilterStatus;
  const isNoRecordFilter = selectedStatus === 'no_record';

  const [result, employeesResult] = await Promise.all([
    fetchList<PayrollSummary>(
      `/payrolls${buildQuery({
        search: params.search,
        employee_id: params.employee_id,
        payroll_month: selectedMonth,
        payroll_year: selectedYear,
        payment_status: isNoRecordFilter ? undefined : selectedStatus || undefined,
      })}`,
    ),
    fetchList<EmployeeSummary>('/employees'),
  ]);
  const payrollEmployeeIds = new Set(result.data.map((payroll) => payroll.employeeId));
  const employeeSearch = params.search?.trim().toLowerCase();
  const employeesWithoutPayroll = employeesResult.data.filter(
    (employee) =>
      (!params.employee_id || employee.id === params.employee_id) &&
      !payrollEmployeeIds.has(employee.id) &&
      (!employeeSearch ||
        employee.fullName.toLowerCase().includes(employeeSearch) ||
        employee.employeeNumber.toLowerCase().includes(employeeSearch)),
  );
  const rowsToShow = isNoRecordFilter ? [] : result.data;

  return (
    <>
      <PageHeader title="قائمة الرواتب" description="متابعة رواتب الشهر المحدد وحالة الدفع لكل موظف بوضوح." />
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
            <MonthSelect defaultValue={selectedMonth} name="payroll_month" />
          </label>
          <label>
            السنة
            <YearSelect defaultValue={selectedYear} name="payroll_year" />
          </label>
          <label>
            حالة الدفع
            <select defaultValue={selectedStatus} name="payment_status">
              <option value="">كل الحالات</option>
              <option value="unpaid">غير مدفوع</option>
              <option value="partially_paid">مدفوع جزئيًا</option>
              <option value="paid">مدفوع بالكامل</option>
              <option value="no_record">لا يوجد راتب مسجل</option>
            </select>
          </label>
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href={`/payrolls/new?payroll_month=${selectedMonth}&payroll_year=${selectedYear}`}>
          إضافة راتب
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}

      {isNoRecordFilter ? (
        employeesWithoutPayroll.length === 0 ? (
          <div className="empty-state">
            <h3>كل الموظفين لديهم راتب مسجل</h3>
            <p>لا توجد أسماء بدون راتب في {selectedMonth}/{selectedYear} حسب الفلاتر الحالية.</p>
          </div>
        ) : (
          <section className="payroll-card-list">
            {employeesWithoutPayroll.map((employee) => (
              <article className="payroll-card payroll-card-muted" key={employee.id}>
                <div className="payroll-card-header">
                  <div>
                    <span>الموظف</span>
                    <h3>{employee.fullName}</h3>
                    <p>
                      شهر {selectedMonth} / سنة {selectedYear}
                    </p>
                  </div>
                  <span className="payroll-status muted">لا يوجد راتب مسجل</span>
                </div>
                <div className="inline-actions">
                  <Link className="text-link" href={`/payrolls/new?employee_id=${employee.id}&payroll_month=${selectedMonth}&payroll_year=${selectedYear}`}>
                    إنشاء راتب مقترح
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )
      ) : rowsToShow.length === 0 ? (
        <div className="empty-state">
          <h3>لا توجد رواتب</h3>
          <p>لا توجد رواتب مسجلة في {selectedMonth}/{selectedYear} حسب الفلاتر الحالية.</p>
        </div>
      ) : (
        <section className="payroll-card-list">
          {rowsToShow.map((row) => (
            <article className="payroll-card" key={row.id}>
              <div className="payroll-card-header">
                <div>
                  <span>الموظف</span>
                  <h3>{row.employee.fullName}</h3>
                  <p>
                    شهر {row.payrollMonth} / سنة {row.payrollYear}
                  </p>
                </div>
                <PayrollStatus status={row.paymentStatus} />
              </div>
              {row.payrollMode === 'hourly' ? (
                <p className="field-hint">
                  نظام بالساعة: {moneyValue(row.workHours)} ساعة × {formatMoney(row.hourlyRate ?? 0)}
                </p>
              ) : null}
              {moneyValue(row.extraHoursAmount) > 0 ? (
                <p className="field-hint">
                  ساعات إضافية: {moneyValue(row.extraHours)} ساعة × {formatMoney(row.extraHourRate ?? 0)}
                </p>
              ) : null}
              <PayrollDetails row={row} />
              <div className="inline-actions">
                <Link className="text-link" href={`/payrolls/${row.id}/edit`}>
                  تعديل
                </Link>
                <Link className="text-link" href={`/payrolls/new?repeat_from=${row.id}`}>
                  تكرار الراتب
                </Link>
                <DeleteFinancialRecordButton path={`/payrolls/${row.id}`} reverse={false} label="حذف فقط" />
                <DeleteFinancialRecordButton path={`/payrolls/${row.id}`} reverse label="حذف وإرجاع للخزنة" />
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
