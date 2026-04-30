import { AttendanceFileUploadForm } from '../../../components/attendance-file-upload-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption, EmployeeSummary } from '../../../lib/types';

export default async function NewAttendanceFilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [employeesResult, branchesResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="رفع ملف حضور" description="ارفع ملف PDF أو Excel للحضور مع ربطه بموظف أو فرع وشهر وسنة." />
      {employeesResult.error || branchesResult.error ? <p className="notice">{employeesResult.error ?? branchesResult.error}</p> : null}
      <AttendanceFileUploadForm branches={branchesResult.data} employees={employeesResult.data} initialEmployeeId={params.employee_id} />
    </>
  );
}
