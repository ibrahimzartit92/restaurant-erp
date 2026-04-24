import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { RolePermissionsForm } from '../../../../components/role-permissions-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { PermissionSummary, RoleSummary } from '../../../../lib/types';

export default async function RolePermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [roleResult, permissionsResult] = await Promise.all([
    fetchOne<RoleSummary>(`/roles/${id}`),
    fetchList<PermissionSummary>('/permissions'),
  ]);

  if (!roleResult.data && !roleResult.error) {
    notFound();
  }

  if (!roleResult.data) {
    return (
      <>
        <PageHeader title="صفحة ربط الصلاحيات بالدور" description="اختر الصلاحيات الخاصة بالدور الحالي بطريقة واضحة ومباشرة." />
        <p className="notice">{roleResult.error ?? 'تعذر تحميل بيانات الدور.'}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="صفحة ربط الصلاحيات بالدور" description="اربط الصلاحيات بالدور من خلال قائمة مجمعة حسب الوحدة لسهولة المراجعة." />
      {permissionsResult.error ? <p className="notice">{permissionsResult.error}</p> : null}
      <RolePermissionsForm permissions={permissionsResult.data} role={roleResult.data} />
    </>
  );
}
