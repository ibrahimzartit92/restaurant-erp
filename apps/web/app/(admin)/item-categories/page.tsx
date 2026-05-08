import { ArchiveDeleteButton } from '../../components/archive-delete-button';
import { ItemCategoryForm } from '../../components/item-category-form';
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
        description="إدارة تصنيف واحد واضح للمواد مثل حلويات، مشروبات، مواد تنظيف، ومواد تشغيل."
      />
      {result.error ? <p className="notice danger">{result.error}</p> : null}

      <ItemCategoryForm />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اللون</th>
              <th>الكود</th>
              <th>الاسم</th>
              <th>الحالة</th>
              <th>تعديل سريع</th>
              <th>حذف / أرشفة</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((category) => (
              <tr key={category.id}>
                <td>
                  <span
                    aria-label={category.color ?? '#14746f'}
                    style={{
                      background: category.color ?? '#14746f',
                      borderRadius: 4,
                      display: 'inline-block',
                      height: 22,
                      width: 42,
                    }}
                  />
                </td>
                <td>{category.code}</td>
                <td>{category.name}</td>
                <td>{category.isActive ? 'نشط' : 'غير نشط'}</td>
                <td>
                  <ItemCategoryForm initialCategory={category} />
                </td>
                <td>
                  <ArchiveDeleteButton entityLabel="تصنيف المادة" path={`/item-categories/${category.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
