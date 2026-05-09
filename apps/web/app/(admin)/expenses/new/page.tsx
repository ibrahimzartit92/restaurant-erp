import { ExpenseForm } from '../../../components/expense-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption, ExpenseCategoryOption, ExpenseTypeOption, VaultOption } from '../../../lib/types';

export default async function NewExpensePage() {
  const [branches, categories, expenseTypes, drawers, bankAccounts, vaults] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTypeOption>('/expense-types'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إضافة مصروف" description="تسجيل مصروف جديد بتصنيف ونوع واضحين، مع دفع جزئي أو كامل عند الحاجة." />
      <ExpenseForm
        mode="create"
        branches={branches.data}
        categories={categories.data}
        expenseTypes={expenseTypes.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        vaults={vaults.data}
      />
    </>
  );
}
