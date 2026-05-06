import { BranchForm } from '../../../../components/core-crud-forms';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';

type BranchDetails = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await fetchOne<BranchDetails>(`/branches/${id}`);

  return (
    <>
      <PageHeader title="تعديل الفرع" description="تحديث بيانات الفرع أو تعطيله بدون التأثير على السجلات التاريخية." />
      {branch.error ? <p className="notice">{branch.error}</p> : null}
      {branch.data ? <BranchForm initialBranch={branch.data} /> : null}
    </>
  );
}
