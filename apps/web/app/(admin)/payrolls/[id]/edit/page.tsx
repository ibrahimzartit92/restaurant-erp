import { notFound } from 'next/navigation';
import { AttachmentsPanel } from '../../../../components/attachments-panel';
import { PageHeader } from '../../../../components/page-header';
import { PayrollForm } from '../../../../components/payroll-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type {
  AttachmentSummary,
  BankAccountOption,
  DrawerOption,
  EmployeeSummary,
  PayrollSummary,
  VaultOption,
} from '../../../../lib/types';

export default async function EditPayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [payrollResult, employeesResult, drawersResult, bankAccountsResult, vaultsResult, attachmentsResult] =
    await Promise.all([
      fetchOne<PayrollSummary>(`/payrolls/${id}`),
      fetchList<EmployeeSummary>('/employees'),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
      fetchList<AttachmentSummary>(`/attachments?entity_type=payroll&entity_id=${id}`),
    ]);

  if (!payrollResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="تعديل راتب" description="حدث بيانات الراتب ومصادر الدفع المرتبطة به." />
      {payrollResult.error ?? employeesResult.error ? <p className="notice">{payrollResult.error ?? employeesResult.error}</p> : null}
      {drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error ? (
        <p className="notice">{drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error}</p>
      ) : null}
      <PayrollForm
        employees={employeesResult.data}
        drawers={drawersResult.data}
        bankAccounts={bankAccountsResult.data}
        vaults={vaultsResult.data}
        initialPayroll={payrollResult.data}
      />
      {attachmentsResult.error ? <p className="notice">{attachmentsResult.error}</p> : null}
      <AttachmentsPanel entityType="payroll" entityId={payrollResult.data.id} initialAttachments={attachmentsResult.data} />
    </>
  );
}
