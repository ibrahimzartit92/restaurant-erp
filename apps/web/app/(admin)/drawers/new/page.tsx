import { DrawerForm } from '../../../components/drawer-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewDrawerPage() {
  const branches = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="إضافة درج نقدي" description="عرّف درج النقد الخاص بالفرع والعهدة اليومية الافتراضية." />
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      <DrawerForm branches={branches.data} />
    </>
  );
}
