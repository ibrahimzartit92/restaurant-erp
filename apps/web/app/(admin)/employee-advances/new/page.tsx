import { EmployeeAdvanceForm } from '../../../components/employee-advance-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { DrawerOption, EmployeeSummary } from '../../../lib/types';

export default async function NewEmployeeAdvancePage() {
  const [employeesResult, drawersResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<DrawerOption>('/drawers'),
  ]);

  return (
    <>
      <PageHeader title="إضافة سلفة" description="سجل سلفة نقدية للموظف وربطها بدرج النقد عند الحاجة." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {drawersResult.error ? <p className="notice">{drawersResult.error}</p> : null}
      <EmployeeAdvanceForm employees={employeesResult.data} drawers={drawersResult.data} />
    </>
  );
}
