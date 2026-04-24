import { PageHeader } from '../../../components/page-header';
import { UserForm } from '../../../components/user-form';
import { fetchList } from '../../../lib/api';
import type { BranchOption, RoleSummary } from '../../../lib/types';

export default async function NewUserPage() {
  const [rolesResult, branchesResult] = await Promise.all([
    fetchList<RoleSummary>('/roles'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="صفحة إضافة مستخدم" description="أضف مستخدماً جديداً وحدد دوره والفرع المقيد به إذا لزم الأمر." />
      {rolesResult.error ? <p className="notice">{rolesResult.error}</p> : null}
      <UserForm branches={branchesResult.data} mode="create" roles={rolesResult.data} />
    </>
  );
}
