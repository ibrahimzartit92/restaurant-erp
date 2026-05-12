import { ItemCategoryManager } from '../../components/item-category-manager';
import { PageHeader } from '../../components/page-header';
import { fetchList } from '../../lib/api';
import type { ItemCategoryOption } from '../../lib/types';

type ItemCategoryRow = ItemCategoryOption & {
  color?: string;
};

export default async function ItemCategoriesPage() {
  const result = await fetchList<ItemCategoryRow>('/item-categories');

  return (
    <>
      <PageHeader
        title="تصنيفات المواد"
        description="إدارة تصنيفات المواد في عرض مضغوط وواضح مع تعديل سريع من نفس الصفحة."
      />
      {result.error ? <p className="notice danger">{result.error}</p> : null}
      <ItemCategoryManager initialCategories={result.data} />
    </>
  );
}
