import { ExpenseForm } from '../../../../components/expense-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
} from '../../../../lib/types';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, branches, categories, templates, drawers, bankAccounts] = await Promise.all([
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
      isFixed: boolean;
      templateId?: string | null;
      notes?: string | null;
    }>(`/expenses/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTemplateOption>('/expense-templates'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

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
      />
    </>
  );
}
