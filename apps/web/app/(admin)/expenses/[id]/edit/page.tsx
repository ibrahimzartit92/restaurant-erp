import { AttachmentsPanel } from '../../../../components/attachments-panel';
import { DeleteFinancialRecordButton } from '../../../../components/delete-financial-record-button';
import { ExpenseForm } from '../../../../components/expense-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type {
  AttachmentSummary,
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
  VaultOption,
} from '../../../../lib/types';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, branches, categories, templates, drawers, bankAccounts, vaults] = await Promise.all([
    fetchOne<{
      id: string;
      expenseDate: string;
      branchId: string;
      expenseCategoryId: string;
      title: string;
      amount: number;
      paymentMethod: string;
      drawerId?: string | null;
      bankAccountId?: string | null;
      vaultId?: string | null;
      paymentAllocations?: {
        paymentMethod: 'cash' | 'bank' | 'vault';
        drawerId: string;
        bankAccountId: string;
        vaultId: string;
        amount: string;
        referenceNumber: string;
        notes: string;
      }[] | null;
      isFixed: boolean;
      templateId?: string | null;
      notes?: string | null;
    }>(`/expenses/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTemplateOption>('/expense-templates'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);
  const attachments = expense.data
    ? await fetchList<AttachmentSummary>(`/attachments?entity_type=expense&entity_id=${expense.data.id}`)
    : { data: [], error: undefined };

  return (
    <>
      <PageHeader title="تعديل مصروف" description="تحديث بيانات المصروف وطريقة الدفع." />
      {expense.error ? <p className="notice">{expense.error}</p> : null}
      <ExpenseForm
        mode="edit"
        initialExpense={expense.data}
        branches={branches.data}
        categories={categories.data}
        templates={templates.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        vaults={vaults.data}
      />
      {expense.data ? (
        <section className="panel">
          <div className="panel-heading">
            <h3>حذف المصروف</h3>
            <span>اختر حذف فقط أو حذف مع إرجاع المبلغ إلى الخزنة.</span>
          </div>
          <div className="inline-actions">
            <DeleteFinancialRecordButton path={`/expenses/${expense.data.id}`} reverse={false} label="حذف فقط" />
            <DeleteFinancialRecordButton path={`/expenses/${expense.data.id}`} reverse label="حذف وإرجاع للخزنة" />
          </div>
        </section>
      ) : null}
      {expense.data ? (
        <>
          {attachments.error ? <p className="notice">{attachments.error}</p> : null}
          <AttachmentsPanel entityType="expense" entityId={expense.data.id} initialAttachments={attachments.data} />
        </>
      ) : null}
    </>
  );
}
