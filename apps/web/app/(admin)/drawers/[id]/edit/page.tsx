import { DrawerForm } from '../../../../components/drawer-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BranchOption } from '../../../../lib/types';

type DrawerDetails = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  defaultOpeningBalance?: number;
  defaultCashFloat?: number;
  isActive: boolean;
  notes?: string | null;
};

export default async function EditDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [drawer, branches] = await Promise.all([fetchOne<DrawerDetails>(`/drawers/${id}`), fetchList<BranchOption>('/branches')]);

  return (
    <>
      <PageHeader title="تعديل الدرج" description="تعديل بيانات الدرج والعهدة اليومية الافتراضية أو حذف الدرج عند الحاجة." />
      {drawer.error ? <p className="notice">{drawer.error}</p> : null}
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      {drawer.data ? <DrawerForm branches={branches.data} initialDrawer={drawer.data} /> : null}
    </>
  );
}
