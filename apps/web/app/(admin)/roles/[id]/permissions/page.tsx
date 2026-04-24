import { notFound } from 'next/navigation';
import { BackendFallbackNote } from '../../../../components/backend-fallback-note';
import { PageHeader } from '../../../../components/page-header';
import { RolePermissionsForm } from '../../../../components/role-permissions-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import { findMockRole, mockPermissions, withMockFallback } from '../../../../lib/access-control-mocks';
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

  const role = roleResult.data ?? findMockRole(id);
  const permissions = withMockFallback(permissionsResult.data, mockPermissions);

  if (!role) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة ربط الصلاحيات بالدور" description="اربط الصلاحيات بالدور من خلال قائمة مجمعة حسب الوحدة لسهولة المراجعة." />
      {roleResult.error ? <p className="notice">{roleResult.error}</p> : null}
      {!roleResult.data ? <BackendFallbackNote message="يتم عرض دور وصلاحيات تجريبية حتى يصبح الربط الخلفي كاملاً." /> : null}
      {permissionsResult.error ? <p className="notice">{permissionsResult.error}</p> : null}
      {permissionsResult.data.length === 0 ? <BackendFallbackNote message="تعذر تحميل الصلاحيات من الخادم، لذلك يتم عرض صلاحيات تجريبية جاهزة." /> : null}
      <RolePermissionsForm permissions={permissions} role={role} />
    </>
  );
}
