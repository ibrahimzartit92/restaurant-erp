import { notFound } from 'next/navigation';
import { EmployeeForm } from '../../../../components/employee-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BranchOption, EmployeeSummary } from '../../../../lib/types';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employeeResult, branchesResult] = await Promise.all([
    fetchOne<EmployeeSummary>(`/employees/${id}`),
    fetchList<BranchOption>('/branches'),
  ]);

  if (!employeeResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل موظف" description="حدّث بيانات الموظف الأساسية وحالته." />
      {employeeResult.error || branchesResult.error ? <p className="notice">{employeeResult.error ?? branchesResult.error}</p> : null}
      <EmployeeForm branches={branchesResult.data} initialEmployee={employeeResult.data} mode="edit" />
    </>
  );
}
