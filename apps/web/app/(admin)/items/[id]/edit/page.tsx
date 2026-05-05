import { ItemForm } from '../../../../components/core-crud-forms';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { ItemCategoryOption, ItemOption, UnitOption } from '../../../../lib/types';

type ItemDetails = ItemOption & {
  categoryId?: string;
  category?: ItemCategoryOption | null;
  unitId?: string;
  searchKeywords?: string | null;
  notes?: string | null;
};

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, categories, units] = await Promise.all([
    fetchOne<ItemDetails>(`/items/${id}`),
    fetchList<ItemCategoryOption>('/item-categories'),
    fetchList<UnitOption>('/units'),
  ]);

  return (
    <>
      <PageHeader title="تعديل مادة" description="حدّث بيانات المادة وأسعارها ووحدتها من نفس النموذج." />
      {item.error ? <p className="notice">{item.error}</p> : null}
      {categories.error ? <p className="notice">{categories.error}</p> : null}
      {units.error ? <p className="notice">{units.error}</p> : null}
      {item.data ? <ItemForm categories={categories.data} units={units.data} initialItem={item.data} /> : null}
    </>
  );
}
