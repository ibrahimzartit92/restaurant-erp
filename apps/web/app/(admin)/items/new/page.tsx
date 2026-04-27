import { ItemForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { ItemCategoryOption, UnitOption } from '../../../lib/types';

export default async function NewItemPage() {
  const [categories, units] = await Promise.all([
    fetchList<ItemCategoryOption>('/item-categories'),
    fetchList<UnitOption>('/units'),
  ]);

  return (
    <>
      <PageHeader title="إضافة مادة" description="أدخل بيانات المادة وربطها بتصنيف ووحدة قبل استخدامها في الفواتير والجرد." />
      {categories.error ? <p className="notice">{categories.error}</p> : null}
      {units.error ? <p className="notice">{units.error}</p> : null}
      <ItemForm categories={categories.data} units={units.data} />
    </>
  );
}
