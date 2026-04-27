import { CloseDrawerSessionForm } from '../../../../components/close-drawer-session-form';
import { PageHeader } from '../../../../components/page-header';

export default async function CloseDrawerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="إغلاق جلسة درج" description="أدخل الرصيد الختامي الفعلي ليتم حساب الفرق." />
      <CloseDrawerSessionForm sessionId={id} />
    </>
  );
}
