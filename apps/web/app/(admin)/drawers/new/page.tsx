import { DrawerForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewDrawerPage() {
  const branches = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="إضافة درج نقدي" description="اربط درج النقد بفرع واحد حتى يمكن فتح جلسات الدرج اليومية." />
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      <DrawerForm branches={branches.data} />
    </>
  );
}
