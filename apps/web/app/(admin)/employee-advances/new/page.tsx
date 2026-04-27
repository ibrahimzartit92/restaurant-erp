import { EmployeeAdvanceForm } from '../../../components/employee-advance-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { EmployeeSummary } from '../../../lib/types';

export default async function NewEmployeeAdvancePage() {
  const employeesResult = await fetchList<EmployeeSummary>('/employees');

  return (
    <>
      <PageHeader title="صفحة إضافة سلفة" description="سجل سلفة جديدة للموظف مع إمكانية ربطها بفترة راتب لاحقًا." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      <EmployeeAdvanceForm employees={employeesResult.data} />
    </>
  );
}
