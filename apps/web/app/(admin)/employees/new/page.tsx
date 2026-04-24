import { EmployeeForm } from '../../../components/employee-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewEmployeePage() {
  const branchesResult = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="صفحة إضافة موظف" description="أدخل البيانات الأساسية للموظف مع الفرع الافتراضي والحالة." />
      {branchesResult.error ? <p className="notice">{branchesResult.error}</p> : null}
      <EmployeeForm branches={branchesResult.data} mode="create" />
    </>
  );
}
