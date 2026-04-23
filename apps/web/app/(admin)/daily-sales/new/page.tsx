import { DailySaleForm } from '../../../components/daily-sale-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewDailySalePage() {
  const branches = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="إضافة مبيعات يومية" description="تسجيل مبيعات فرع واحد ليوم واحد." />
      <DailySaleForm mode="create" branches={branches.data} />
    </>
  );
}
