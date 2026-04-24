import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { RoleForm } from '../../../../components/role-form';
import { fetchOne } from '../../../../lib/api';
import type { RoleSummary } from '../../../../lib/types';

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchOne<RoleSummary>(`/roles/${id}`);

  if (!result.data && !result.error) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل دور" description="حدّث اسم الدور أو كوده أو ملاحظاته مع الحفاظ على تنظيم الأدوار الحالية." />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <RoleForm initialRole={result.data} mode="edit" />
    </>
  );
}
