import { ExpenseCategoryManager } from '../../components/expense-category-manager';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList } from '../../lib/api';

type ExpenseCategoryRow = {
  id: string;
  name: string;
  isFixed: boolean;
  classification?: 'operating' | 'miscellaneous';
  notes?: string | null;
};

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<ExpenseCategoryRow>(`/expense-categories${buildQuery({ search: params.search })}`);

  return (
    <>
      <PageHeader
        title="أنواع المصاريف"
        description="إدارة أنواع المصاريف وتصنيفها إلى مصاريف تشغيلية أو متفرقات لاستخدامها في التقارير ولوحة التحكم."
      />
      <ListFilters searchPlaceholder="اسم نوع المصروف" />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <ExpenseCategoryManager categories={result.data} />
    </>
  );
}
