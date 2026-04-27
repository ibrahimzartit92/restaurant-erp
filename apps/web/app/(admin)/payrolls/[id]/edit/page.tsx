import { notFound } from 'next/navigation';
import { AttachmentsPanel } from '../../../../components/attachments-panel';
import { PageHeader } from '../../../../components/page-header';
import { PayrollForm } from '../../../../components/payroll-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { AttachmentSummary, EmployeeSummary, PayrollSummary } from '../../../../lib/types';

export default async function EditPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [payrollResult, employeesResult] = await Promise.all([
    fetchOne<PayrollSummary>(`/payrolls/${id}`),
    fetchList<EmployeeSummary>('/employees'),
  ]);
  const attachmentsResult = await fetchList<AttachmentSummary>(`/attachments?entity_type=payroll&entity_id=${id}`);

  if (!payrollResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل راتب" description="حدّث بيانات الراتب الشهرية للموظف." />
      {payrollResult.error || employeesResult.error ? <p className="notice">{payrollResult.error ?? employeesResult.error}</p> : null}
      <PayrollForm employees={employeesResult.data} initialPayroll={payrollResult.data} />
      {attachmentsResult.error ? <p className="notice">{attachmentsResult.error}</p> : null}
      <AttachmentsPanel entityType="payroll" entityId={payrollResult.data.id} initialAttachments={attachmentsResult.data} />
    </>
  );
}
