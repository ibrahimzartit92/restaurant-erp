import { AttendanceFileUploadForm } from '../../../components/attendance-file-upload-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption, EmployeeSummary } from '../../../lib/types';

export default async function NewAttendanceFilePage() {
  const [employeesResult, branchesResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="صفحة رفع ملف بصمة" description="ارفع ملف PDF أو Excel للحضور مع ربطه بموظف أو فرع وشهر وسنة." />
      {employeesResult.error || branchesResult.error ? <p className="notice">{employeesResult.error ?? branchesResult.error}</p> : null}
      <AttendanceFileUploadForm branches={branchesResult.data} employees={employeesResult.data} />
    </>
  );
}
