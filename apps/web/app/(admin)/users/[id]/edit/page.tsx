import { notFound } from 'next/navigation';
import { BackendFallbackNote } from '../../../../components/backend-fallback-note';
import { PageHeader } from '../../../../components/page-header';
import { UserForm } from '../../../../components/user-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import { findMockUser, mockBranches, mockRoles, withMockFallback } from '../../../../lib/access-control-mocks';
import type { BranchOption, RoleSummary, UserSummary } from '../../../../lib/types';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [userResult, rolesResult, branchesResult] = await Promise.all([
    fetchOne<UserSummary>(`/users/${id}`),
    fetchList<RoleSummary>('/roles'),
    fetchList<BranchOption>('/branches'),
  ]);

  const user = userResult.data ?? findMockUser(id);
  const roles = withMockFallback(rolesResult.data, mockRoles);
  const branches = withMockFallback(branchesResult.data, mockBranches);

  if (!user) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل مستخدم" description="عدّل بيانات المستخدم أو انقل صلاحياته إلى دور آخر مع الحفاظ على بساطة الإدارة." />
      {userResult.error ? <p className="notice">{userResult.error}</p> : null}
      {!userResult.data ? (
        <BackendFallbackNote message="تعذر تحميل بيانات المستخدم من الخادم، لذلك يتم عرض سجل تجريبي آمن للتصميم والتجربة." />
      ) : null}
      <UserForm branches={branches} initialUser={user} mode="edit" roles={roles} />
    </>
  );
}
