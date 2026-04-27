import { notFound } from 'next/navigation';
import { BackendFallbackNote } from '../../../../components/backend-fallback-note';
import { PageHeader } from '../../../../components/page-header';
import { RoleForm } from '../../../../components/role-form';
import { fetchOne } from '../../../../lib/api';
import { findMockRole } from '../../../../lib/access-control-mocks';
import type { RoleSummary } from '../../../../lib/types';

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchOne<RoleSummary>(`/roles/${id}`);
  const role = result.data ?? findMockRole(id);

  if (!role) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل دور" description="حدّث اسم الدور أو كوده أو ملاحظاته مع الحفاظ على تنظيم الأدوار الحالية." />
      {result.error ? <p className="notice">{result.error}</p> : null}
      {!result.data ? <BackendFallbackNote message="تعذر تحميل الدور من الخادم، لذلك يتم عرض سجل تجريبي حتى تكتمل الواجهة الخلفية." /> : null}
      <RoleForm initialRole={role} mode="edit" />
    </>
  );
}
