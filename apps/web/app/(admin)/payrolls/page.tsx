import Link from 'next/link';
import { DeleteFinancialRecordButton } from '../../components/delete-financial-record-button';
import { MonthSelect, YearSelect } from '../../components/month-year-selects';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import type { EmployeeSummary, PayrollSummary } from '../../lib/types';

const statusLabels: Record<NonNullable<PayrollSummary['paymentStatus']>, string> = {
  unpaid: 'غير مدفوع',
  partially_paid: 'مدفوع جزئيًا',
  paid: 'مدفوع بالكامل',
};

const statusClass: Record<NonNullable<PayrollSummary['paymentStatus']>, string> = {
  unpaid: 'danger',
  partially_paid: 'info',
  paid: 'success',
};

function PayrollStatus({ status = 'unpaid' }: Readonly<{ status?: PayrollSummary['paymentStatus'] }>) {
  const normalized = status ?? 'unpaid';
  return <span className={`payroll-status ${statusClass[normalized]}`}>{statusLabels[normalized]}</span>;
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

export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [result, employeesResult] = await Promise.all([
    fetchList<PayrollSummary>(
      `/payrolls${buildQuery({
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
      <PageHeader title="قائمة الرواتب" description="متابعة الرواتب الشهرية وحالة الدفع لكل موظف بوضوح." />
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
        <Link className="primary-button" href="/payrolls/new">
          إضافة راتب
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      {result.data.length === 0 ? (
        <div className="empty-state">
          <h3>لا توجد رواتب</h3>
          <p>أضف راتبا جديدا وسيظهر هنا.</p>
        </div>
      ) : (
        <section className="payroll-card-list">
          {result.data.map((row) => (
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
              <div className="payroll-amount-grid">
                <PayrollAmount label="إجمالي الراتب" value={row.baseSalary + row.allowancesAmount} />
                <PayrollAmount label="سلف الموظف" value={row.advancesDeductionAmount} tone="warning" />
                <PayrollAmount label="العقوبات" value={row.penaltiesDeductionAmount + row.otherDeductionAmount} tone="danger" />
                <PayrollAmount label="الراتب الصافي" value={row.netSalary} tone="neutral" />
                <PayrollAmount label="المدفوع" value={row.paidAmount ?? 0} tone="success" />
                <PayrollAmount label="المتبقي" value={row.remainingAmount ?? 0} tone="highlight" />
              </div>
              <div className="inline-actions">
                <Link className="text-link" href={`/payrolls/${row.id}/edit`}>
                  تعديل
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
