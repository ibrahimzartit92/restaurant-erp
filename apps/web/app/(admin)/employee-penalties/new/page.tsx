import { EmployeePenaltyForm } from '../../../components/employee-penalty-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { EmployeeSummary } from '../../../lib/types';

export default async function NewEmployeePenaltyPage() {
  const employeesResult = await fetchList<EmployeeSummary>('/employees');

  return (
    <>
      <PageHeader title="صفحة إضافة عقوبة" description="سجل عقوبة جديدة للموظف مع السبب وفترة الراتب إن وجدت." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      <EmployeePenaltyForm employees={employeesResult.data} />
    </>
  );
}
