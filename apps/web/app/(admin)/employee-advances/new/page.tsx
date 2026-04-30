import { EmployeeAdvanceForm } from '../../../components/employee-advance-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { DrawerOption, EmployeeSummary } from '../../../lib/types';

export default async function NewEmployeeAdvancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [employeesResult, drawersResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<DrawerOption>('/drawers'),
  ]);

  return (
    <>
      <PageHeader title="إضافة سلفة" description="سجل سلفة نقدية للموظف واربطها بفترة الراتب حتى تخصم مرة واحدة عند إنشاء الراتب." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {drawersResult.error ? <p className="notice">{drawersResult.error}</p> : null}
      <EmployeeAdvanceForm employees={employeesResult.data} drawers={drawersResult.data} initialEmployeeId={params.employee_id} />
    </>
  );
}
