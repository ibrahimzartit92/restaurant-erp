import { DrawerSessionForm } from '../../../components/drawer-session-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { DrawerOption } from '../../../lib/types';

export default async function NewDrawerSessionPage() {
  const drawers = await fetchList<DrawerOption>('/drawers');

  return (
    <>
      <PageHeader title="فتح جلسة درج" description="أدخل الرصيد الافتتاحي اليدوي لبداية اليوم." />
      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      <DrawerSessionForm drawers={drawers.data} />
    </>
  );
}
