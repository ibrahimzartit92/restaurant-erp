import { ExpenseForm } from '../../../components/expense-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
  VaultOption,
} from '../../../lib/types';

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [branches, categories, templates, drawers, bankAccounts, vaults] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTemplateOption>('/expense-templates'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إضافة مصروف" description="تسجيل مصروف جديد وربطه بالفرع ومصدر الدفع المناسب." />
      <ExpenseForm
        mode="create"
        initialTemplateId={params.templateId}
        branches={branches.data}
        categories={categories.data}
        templates={templates.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        vaults={vaults.data}
      />
    </>
  );
}
