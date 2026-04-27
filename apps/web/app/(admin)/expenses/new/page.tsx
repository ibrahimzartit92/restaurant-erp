import { ExpenseForm } from '../../../components/expense-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
} from '../../../lib/types';

export default async function NewExpensePage() {
  const [branches, categories, templates, drawers, bankAccounts] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTemplateOption>('/expense-templates'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

  return (
    <>
      <PageHeader title="إضافة مصروف" description="تسجيل مصروف جديد وربطه بالفرع وطريقة الدفع." />
      <ExpenseForm
        mode="create"
        branches={branches.data}
        categories={categories.data}
        templates={templates.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
      />
    </>
  );
}
