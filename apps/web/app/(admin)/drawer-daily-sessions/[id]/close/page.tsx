import { CloseDrawerSessionForm } from '../../../../components/close-drawer-session-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';

export default async function CloseDrawerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await fetchOne<{ requiredClosingFloat?: number }>(`/drawer-daily-sessions/${id}`);

  return (
    <>
      <PageHeader title="إغلاق جلسة درج" description="أدخل النقد الفعلي الموجود في الدرج لإتمام تسوية اليوم." />
      {session.error ? <p className="notice">{session.error}</p> : null}
      <CloseDrawerSessionForm sessionId={id} requiredClosingFloat={session.data?.requiredClosingFloat ?? 0} />
    </>
  );
}
