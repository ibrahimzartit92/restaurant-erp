import { PageHeader } from '../../../components/page-header';
import { PayrollForm } from '../../../components/payroll-form';
import { fetchList } from '../../../lib/api';
import type { EmployeeSummary } from '../../../lib/types';

export default async function NewPayrollPage() {
  const employeesResult = await fetchList<EmployeeSummary>('/employees');

  return (
    <>
      <PageHeader title="صفحة إضافة راتب" description="سجل راتبًا شهريًا للموظف مع البدلات والخصومات وصافي الراتب." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      <PayrollForm employees={employeesResult.data} />
    </>
  );
}
