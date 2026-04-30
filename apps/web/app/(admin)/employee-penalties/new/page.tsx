import { EmployeePenaltyForm } from '../../../components/employee-penalty-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { EmployeeSummary } from '../../../lib/types';

export default async function NewEmployeePenaltyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const employeesResult = await fetchList<EmployeeSummary>('/employees');

  return (
    <>
      <PageHeader title="إضافة عقوبة" description="سجل عقوبة للموظف واربطها بالشهر والسنة حتى تخصم من راتب تلك الفترة مرة واحدة." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      <EmployeePenaltyForm employees={employeesResult.data} initialEmployeeId={params.employee_id} />
    </>
  );
}
