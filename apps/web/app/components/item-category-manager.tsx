'use client';

import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { ItemCategoryOption } from '../lib/types';
import { ActionToast } from './action-toast';
import { ModalDialog } from './modal-dialog';

export function ItemCategoryManager({ initialCategories }: Readonly<{ initialCategories: ItemCategoryOption[] }>) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string | null }>({ tone: 'success', message: null });

  const editingCategory = categories.find((item) => item.id === editingId) ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast({ tone: 'success', message: null });
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      code: String(formData.get('code') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      color: String(formData.get('color') ?? '#14746f'),
      isActive: formData.get('isActive') === 'on',
    };

    try {
      const saved = await submitJson<ItemCategoryOption>(
        editingCategory ? `/item-categories/${editingCategory.id}` : '/item-categories',
        editingCategory ? 'PATCH' : 'POST',
        payload,
      );
      setCategories((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex === -1) return [saved, ...current];
        return current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
      });
      setIsOpen(false);
      setEditingId(null);
      event.currentTarget.reset();
      setToast({ tone: 'success', message: editingCategory ? 'تم تحديث تصنيف المادة بنجاح.' : 'تم إضافة تصنيف المادة بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ تصنيف المادة.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCategory(category: ItemCategoryOption) {
    if (!confirm(`سيتم حذف أو أرشفة تصنيف المادة "${category.name}" حسب الارتباطات. متابعة؟`)) return;
    setToast({ tone: 'success', message: null });
    try {
      await submitJson(`/item-categories/${category.id}`, 'DELETE', {});
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setToast({ tone: 'success', message: 'تم تحديث تصنيف المادة.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حذف أو أرشفة تصنيف المادة.' });
    }
  }

  return (
    <section className="compact-stack">
      <div className="compact-actions-bar compact-panel">
        <strong>تصنيفات المواد</strong>
        <button className="primary-button compact" onClick={() => { setEditingId(null); setIsOpen(true); }} type="button">إضافة تصنيف</button>
      </div>

      <ActionToast message={toast.message} tone={toast.tone} />

      <div className="table-wrap compact-table-rows">
        <table>
          <thead>
            <tr>
              <th>اللون</th>
              <th>الكود</th>
              <th>الاسم</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <span
                    aria-label={category.color ?? '#14746f'}
                    style={{
                      background: category.color ?? '#14746f',
                      borderRadius: 4,
                      display: 'inline-block',
                      height: 18,
                      width: 32,
                    }}
                  />
                </td>
                <td>{category.code}</td>
                <td>{category.name}</td>
                <td>{category.isActive ? 'نشط' : 'غير نشط'}</td>
                <td>
                  <div className="inline-actions">
                    <button className="secondary-button compact" onClick={() => { setEditingId(category.id); setIsOpen(true); }} type="button">تعديل</button>
                    <button className="secondary-button compact danger" onClick={() => archiveCategory(category)} type="button">أرشفة</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalDialog onClose={() => !isSaving && setIsOpen(false)} open={isOpen} title={editingCategory ? 'تعديل تصنيف المادة' : 'إضافة تصنيف مادة'} width="620px">
        <form className="compact-stack" onSubmit={handleSubmit}>
          <label>
            كود التصنيف
            <input defaultValue={editingCategory?.code ?? ''} name="code" required />
          </label>
          <label>
            اسم التصنيف
            <input defaultValue={editingCategory?.name ?? ''} name="name" required />
          </label>
          <label>
            اللون
            <input defaultValue={editingCategory?.color ?? '#14746f'} name="color" type="color" />
          </label>
          <label className="checkbox-field">
            <input defaultChecked={editingCategory?.isActive ?? true} name="isActive" type="checkbox" />
            التصنيف نشط
          </label>
          <div className="compact-actions-bar">
            <button className="secondary-button compact" onClick={() => setIsOpen(false)} type="button">إلغاء</button>
            <button disabled={isSaving} type="submit">{isSaving ? 'جارٍ الحفظ...' : editingCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}</button>
          </div>
        </form>
      </ModalDialog>
    </section>
  );
}
