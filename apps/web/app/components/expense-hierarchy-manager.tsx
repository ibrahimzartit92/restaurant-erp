'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJson } from '../lib/client-api';
import type { ExpenseCategoryOption, ExpenseTypeOption } from '../lib/types';

function classificationLabel(value?: string) {
  return value === 'operating' ? 'تشغيلية' : 'متفرقة';
}

export function ExpenseHierarchyManager({
  categories,
  expenseTypes,
}: Readonly<{
  categories: ExpenseCategoryOption[];
  expenseTypes: ExpenseTypeOption[];
}>) {
  const router = useRouter();
  const activeCategories = categories.filter((category) => category.isActive !== false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(activeCategories[0]?.id ?? categories[0]?.id ?? '');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const editingCategory = categories.find((category) => category.id === editingCategoryId) ?? null;
  const editingType = expenseTypes.find((expenseType) => expenseType.id === editingTypeId) ?? null;
  const selectedTypes = useMemo(
    () => expenseTypes.filter((expenseType) => expenseType.categoryId === selectedCategoryId),
    [expenseTypes, selectedCategoryId],
  );

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const classification = String(formData.get('classification') ?? 'miscellaneous') as 'operating' | 'miscellaneous';
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      classification,
      isFixed: classification === 'operating',
      isActive: formData.get('isActive') === 'on',
      notes: String(formData.get('notes') ?? '').trim() || null,
    };

    try {
      const saved = await submitJson<ExpenseCategoryOption>(
        editingCategoryId ? `/expense-categories/${editingCategoryId}` : '/expense-categories',
        editingCategoryId ? 'PATCH' : 'POST',
        payload,
      );
      setSelectedCategoryId(saved.id);
      setEditingCategoryId(null);
      event.currentTarget.reset();
      setMessage(editingCategoryId ? 'تم تحديث التصنيف.' : 'تم إنشاء التصنيف.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ التصنيف.');
    }
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categoryId = String(formData.get('categoryId') ?? selectedCategoryId);
    const payload = {
      categoryId,
      name: String(formData.get('name') ?? '').trim(),
      code: String(formData.get('code') ?? '').trim() || undefined,
      isActive: formData.get('isActive') === 'on',
      notes: String(formData.get('notes') ?? '').trim() || null,
    };

    try {
      await submitJson(editingTypeId ? `/expense-types/${editingTypeId}` : '/expense-types', editingTypeId ? 'PATCH' : 'POST', payload);
      setSelectedCategoryId(categoryId);
      setEditingTypeId(null);
      event.currentTarget.reset();
      setMessage(editingTypeId ? 'تم تحديث نوع المصروف.' : 'تم إنشاء نوع المصروف.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ نوع المصروف.');
    }
  }

  async function archiveCategory(category: ExpenseCategoryOption) {
    if (!confirm(`سيتم أرشفة التصنيف "${category.name}" إذا كان مرتبطًا بسجلات. هل تريد المتابعة؟`)) return;
    try {
      await submitJson(`/expense-categories/${category.id}/delete`, 'POST', {});
      setMessage('تم حذف أو أرشفة التصنيف حسب الارتباطات.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف أو أرشفة التصنيف.');
    }
  }

  async function archiveType(expenseType: ExpenseTypeOption) {
    if (!confirm(`سيتم أرشفة نوع المصروف "${expenseType.name}" إذا كان مرتبطًا بسجلات. هل تريد المتابعة؟`)) return;
    try {
      await submitJson(`/expense-types/${expenseType.id}/delete`, 'POST', {});
      setMessage('تم حذف أو أرشفة نوع المصروف حسب الارتباطات.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف أو أرشفة نوع المصروف.');
    }
  }

  return (
    <section className="form-panel stacked-sections">
      <div className="panel-heading">
        <div>
          <h2>إدارة تصنيفات وأنواع المصاريف</h2>
          <span>اختر التصنيف أولًا، ثم أضف الأنواع التي ستظهر في نموذج إدخال المصروف.</span>
        </div>
      </div>
      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}

      <div className="form-grid">
        <form key={editingCategory?.id ?? 'new-category'} onSubmit={saveCategory} className="stacked-sections">
          <h3>{editingCategory ? 'تعديل تصنيف' : 'تصنيف جديد'}</h3>
          <label>
            اسم التصنيف
            <input name="name" defaultValue={editingCategory?.name ?? ''} maxLength={160} required />
          </label>
          <label>
            طبيعة التصنيف
            <select name="classification" defaultValue={editingCategory?.classification ?? 'miscellaneous'}>
              <option value="operating">تشغيلية</option>
              <option value="miscellaneous">متفرقة</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input name="isActive" type="checkbox" defaultChecked={editingCategory?.isActive ?? true} />
            نشط
          </label>
          <label>
            ملاحظات
            <textarea name="notes" rows={2} defaultValue={editingCategory?.notes ?? ''} />
          </label>
          <div className="form-actions">
            {editingCategoryId ? (
              <button className="secondary-button" type="button" onClick={() => setEditingCategoryId(null)}>
                إلغاء
              </button>
            ) : null}
            <button type="submit">{editingCategoryId ? 'حفظ التصنيف' : 'إضافة تصنيف'}</button>
          </div>
        </form>

        <form key={editingType?.id ?? selectedCategoryId} onSubmit={saveType} className="stacked-sections">
          <h3>{editingType ? 'تعديل نوع' : 'نوع جديد'}</h3>
          <label>
            التصنيف
            <select name="categoryId" value={editingType?.categoryId ?? selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.isActive === false ? '(مؤرشف)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            اسم النوع
            <input name="name" defaultValue={editingType?.name ?? ''} maxLength={160} required />
          </label>
          <label>
            الرمز
            <input name="code" defaultValue={editingType?.code ?? ''} maxLength={50} placeholder="اختياري" />
          </label>
          <label className="checkbox-field">
            <input name="isActive" type="checkbox" defaultChecked={editingType?.isActive ?? true} />
            نشط
          </label>
          <label>
            ملاحظات
            <textarea name="notes" rows={2} defaultValue={editingType?.notes ?? ''} />
          </label>
          <div className="form-actions">
            {editingTypeId ? (
              <button className="secondary-button" type="button" onClick={() => setEditingTypeId(null)}>
                إلغاء
              </button>
            ) : null}
            <button type="submit">{editingTypeId ? 'حفظ النوع' : 'إضافة نوع'}</button>
          </div>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>التصنيف</th>
              <th>الطبيعة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <button className="text-link" type="button" onClick={() => setSelectedCategoryId(category.id)}>
                    {category.name}
                  </button>
                </td>
                <td>{classificationLabel(category.classification)}</td>
                <td>{category.isActive === false ? 'مؤرشف' : 'نشط'}</td>
                <td>
                  <div className="inline-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditingCategoryId(category.id)}>
                      تعديل
                    </button>
                    <button className="secondary-button danger" type="button" onClick={() => archiveCategory(category)}>
                      حذف / أرشفة
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>أنواع {selectedCategory?.name ?? 'المصروف'}</th>
              <th>الرمز</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {selectedTypes.map((expenseType) => (
              <tr key={expenseType.id}>
                <td>{expenseType.name}</td>
                <td>{expenseType.code}</td>
                <td>{expenseType.isActive === false ? 'مؤرشف' : 'نشط'}</td>
                <td>
                  <div className="inline-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditingTypeId(expenseType.id)}>
                      تعديل
                    </button>
                    <button className="secondary-button danger" type="button" onClick={() => archiveType(expenseType)}>
                      حذف / أرشفة
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {selectedTypes.length === 0 ? (
              <tr>
                <td colSpan={4}>لا توجد أنواع داخل هذا التصنيف بعد.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
