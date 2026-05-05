import { ExpenseTemplateManager } from '../../components/expense-template-manager';
import { PageHeader } from '../../components/page-header';
import { fetchList, getMoneyFormatter } from '../../lib/api';
import type { BranchOption, ExpenseCategoryOption, ExpenseTemplateOption } from '../../lib/types';

export default async function ExpenseTemplatesPage() {
  const [templates, branches, categories, formatMoney] = await Promise.all([
    fetchList<ExpenseTemplateOption>('/expense-templates'),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    getMoneyFormatter(),
  ]);

  return (
    <>
      <PageHeader
        title="قوالب المصاريف"
        description="قوالب جاهزة للمصاريف المتكررة مع مبلغ وطريقة دفع افتراضية لتسريع الإدخال اليومي."
      />
      {templates.error ? <p className="notice danger">{templates.error}</p> : null}
      <ExpenseTemplateManager
        templates={templates.data}
        branches={branches.data}
        categories={categories.data}
        formatMoney={formatMoney}
      />
    </>
  );
}
