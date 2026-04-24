import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { UserForm } from '../../../../components/user-form';
import { fetchList, fetchOne } from '../../../../lib/api';
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

  if (!userResult.data && !userResult.error) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل مستخدم" description="عدّل بيانات المستخدم أو انقل صلاحياته إلى دور آخر مع الحفاظ على بساطة الإدارة." />
      {userResult.error ? <p className="notice">{userResult.error}</p> : null}
      <UserForm branches={branchesResult.data} initialUser={userResult.data} mode="edit" roles={rolesResult.data} />
    </>
  );
}
