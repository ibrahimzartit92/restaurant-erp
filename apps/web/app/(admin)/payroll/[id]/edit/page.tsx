import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { PayrollForm } from '../../../../components/payroll-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { EmployeeSummary, PayrollSummary } from '../../../../lib/types';

export default async function EditPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [payrollResult, employeesResult] = await Promise.all([
    fetchOne<PayrollSummary>(`/payrolls/${id}`),
    fetchList<EmployeeSummary>('/employees'),
  ]);

  if (!payrollResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل راتب" description="حدّث بيانات الراتب الشهرية للموظف." />
      {payrollResult.error || employeesResult.error ? <p className="notice">{payrollResult.error ?? employeesResult.error}</p> : null}
      <PayrollForm employees={employeesResult.data} initialPayroll={payrollResult.data} />
    </>
  );
}
