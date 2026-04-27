import { BackendFallbackNote } from '../../../components/backend-fallback-note';
import { PageHeader } from '../../../components/page-header';
import { UserForm } from '../../../components/user-form';
import { fetchList } from '../../../lib/api';
import { mockBranches, mockRoles, withMockFallback } from '../../../lib/access-control-mocks';
import type { BranchOption, RoleSummary } from '../../../lib/types';

export default async function NewUserPage() {
  const [rolesResult, branchesResult] = await Promise.all([
    fetchList<RoleSummary>('/roles'),
    fetchList<BranchOption>('/branches'),
  ]);

  const roles = withMockFallback(rolesResult.data, mockRoles);
  const branches = withMockFallback(branchesResult.data, mockBranches);

  return (
    <>
      <PageHeader title="صفحة إضافة مستخدم" description="أضف مستخدماً جديداً وحدد دوره والفرع المقيد به إذا لزم الأمر." />
      {rolesResult.error ? <p className="notice">{rolesResult.error}</p> : null}
      {(rolesResult.data.length === 0 || branchesResult.data.length === 0) ? (
        <BackendFallbackNote message="تظهر هذه الصفحة الآن ببيانات اختيار تجريبية حتى يكتمل الربط مع الأدوار والفروع." />
      ) : null}
      <UserForm branches={branches} mode="create" roles={roles} />
    </>
  );
}
