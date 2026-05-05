'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

type ExpenseCategoryRow = {
  id: string;
  name: string;
  isFixed: boolean;
  classification?: 'operating' | 'miscellaneous';
  notes?: string | null;
};

function classificationLabel(value?: string) {
  return value === 'operating' ? 'مصاريف تشغيلية' : 'مصاريف متفرقات';
}

export function ExpenseCategoryManager({ categories }: Readonly<{ categories: ExpenseCategoryRow[] }>) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editingCategory = categories.find((category) => category.id === editingId) ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      classification: String(formData.get('classification') ?? 'miscellaneous'),
      isFixed: formData.get('classification') === 'operating',
      notes: String(formData.get('notes') ?? '').trim() || null,
    };

    try {
      await submitJson(editingId ? `/expense-categories/${editingId}` : '/expense-categories', editingId ? 'PATCH' : 'POST', payload);
      event.currentTarget.reset();
      setEditingId(null);
      router.refresh();
      setMessage(editingId ? 'تم حفظ تعديل نوع المصروف.' : 'تمت إضافة نوع المصروف.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ نوع المصروف.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(category: ExpenseCategoryRow) {
    if (!window.confirm(`هل تريد حذف نوع المصروف "${category.name}"؟ لا يمكن حذف النوع إذا كان مستخدما.`)) {
      return;
    }

    setMessage(null);

    try {
      await submitJson(`/expense-categories/${category.id}/delete`, 'POST', {});
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف نوع المصروف.');
    }
  }

  return (
    <div className="stacked-sections">
      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}

      <form className="form-panel" key={editingCategory?.id ?? 'new'} onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            اسم النوع
            <input name="name" maxLength={160} required defaultValue={editingCategory?.name ?? ''} />
          </label>
          <label>
            التصنيف
            <select name="classification" defaultValue={editingCategory?.classification ?? (editingCategory?.isFixed ? 'operating' : 'miscellaneous')}>
              <option value="operating">مصاريف تشغيلية</option>
              <option value="miscellaneous">مصاريف متفرقات</option>
            </select>
          </label>
        </div>
        <label>
          ملاحظات
          <textarea name="notes" rows={3} defaultValue={editingCategory?.notes ?? ''} />
        </label>
        <div className="form-actions">
          {editingId ? (
            <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>
              إلغاء التعديل
            </button>
          ) : null}
          <button disabled={isSaving} type="submit">
            {isSaving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة نوع مصروف'}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>التصنيف</th>
              <th>ملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{classificationLabel(category.classification ?? (category.isFixed ? 'operating' : 'miscellaneous'))}</td>
                <td>{category.notes ?? 'لا توجد'}</td>
                <td>
                  <div className="inline-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditingId(category.id)}>
                      تعديل
                    </button>
                    <button className="secondary-button danger" type="button" onClick={() => deleteCategory(category)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
