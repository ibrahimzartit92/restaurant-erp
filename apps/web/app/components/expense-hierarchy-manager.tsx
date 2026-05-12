'use client';

import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { ExpenseCategoryOption, ExpenseTypeOption } from '../lib/types';
import { ActionToast } from './action-toast';
import { ModalDialog } from './modal-dialog';

function classificationLabel(value?: string) {
  return value === 'operating' ? 'تشغيلية' : 'متفرقة';
}

export function ExpenseHierarchyManager({
  categories: initialCategories,
  expenseTypes: initialExpenseTypes,
}: Readonly<{
  categories: ExpenseCategoryOption[];
  expenseTypes: ExpenseTypeOption[];
}>) {
  const [categories, setCategories] = useState(initialCategories);
  const [expenseTypes, setExpenseTypes] = useState(initialExpenseTypes);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategories[0]?.id ?? '');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string | null }>({ tone: 'success', message: null });

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const editingCategory = categories.find((category) => category.id === editingCategoryId) ?? null;
  const editingType = expenseTypes.find((expenseType) => expenseType.id === editingTypeId) ?? null;
  const selectedTypes = useMemo(
    () => expenseTypes.filter((expenseType) => expenseType.categoryId === selectedCategoryId),
    [expenseTypes, selectedCategoryId],
  );

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast({ tone: 'success', message: null });
    setIsSaving(true);
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
      setCategories((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex === -1) return [saved, ...current];
        return current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
      });
      setSelectedCategoryId(saved.id);
      setEditingCategoryId(null);
      setIsCategoryOpen(false);
      event.currentTarget.reset();
      setToast({ tone: 'success', message: editingCategoryId ? 'تم تحديث التصنيف بنجاح.' : 'تم إضافة التصنيف بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ التصنيف.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast({ tone: 'success', message: null });
    setIsSaving(true);
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
      const saved = await submitJson<ExpenseTypeOption>(
        editingTypeId ? `/expense-types/${editingTypeId}` : '/expense-types',
        editingTypeId ? 'PATCH' : 'POST',
        payload,
      );
      setExpenseTypes((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex === -1) return [saved, ...current];
        return current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
      });
      setSelectedCategoryId(categoryId);
      setEditingTypeId(null);
      setIsTypeOpen(false);
      event.currentTarget.reset();
      setToast({ tone: 'success', message: editingTypeId ? 'تم تحديث النوع بنجاح.' : 'تم إضافة النوع بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ النوع.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCategory(category: ExpenseCategoryOption) {
    if (!confirm(`سيتم حذف أو أرشفة التصنيف "${category.name}" حسب الارتباطات. متابعة؟`)) return;
    setToast({ tone: 'success', message: null });
    try {
      await submitJson(`/expense-categories/${category.id}/delete`, 'POST', {});
      setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, isActive: false } : item)));
      setToast({ tone: 'success', message: 'تم تحديث حالة التصنيف.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حذف أو أرشفة التصنيف.' });
    }
  }

  async function archiveType(expenseType: ExpenseTypeOption) {
    if (!confirm(`سيتم حذف أو أرشفة النوع "${expenseType.name}" حسب الارتباطات. متابعة؟`)) return;
    setToast({ tone: 'success', message: null });
    try {
      await submitJson(`/expense-types/${expenseType.id}/delete`, 'POST', {});
      setExpenseTypes((current) => current.map((item) => (item.id === expenseType.id ? { ...item, isActive: false } : item)));
      setToast({ tone: 'success', message: 'تم تحديث حالة النوع.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حذف أو أرشفة النوع.' });
    }
  }

  return (
    <section className="compact-stack">
      <div className="compact-actions-bar compact-panel">
        <strong>إدارة التصنيفات والأنواع</strong>
        <button className="secondary-button compact" onClick={() => { setEditingCategoryId(null); setIsCategoryOpen(true); }} type="button">إضافة تصنيف</button>
        <button className="secondary-button compact" onClick={() => { setEditingTypeId(null); setIsTypeOpen(true); }} type="button">إضافة نوع</button>
      </div>

      <ActionToast message={toast.message} tone={toast.tone} />

      <div className="table-wrap compact-table-rows">
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
                  <button className="text-link" onClick={() => setSelectedCategoryId(category.id)} type="button">{category.name}</button>
                </td>
                <td>{classificationLabel(category.classification)}</td>
                <td>{category.isActive === false ? 'مؤرشف' : 'نشط'}</td>
                <td>
                  <div className="inline-actions">
                    <button className="secondary-button compact" onClick={() => { setEditingCategoryId(category.id); setIsCategoryOpen(true); }} type="button">تعديل</button>
                    <button className="secondary-button compact danger" onClick={() => archiveCategory(category)} type="button">أرشفة</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap compact-table-rows">
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
                    <button className="secondary-button compact" onClick={() => { setEditingTypeId(expenseType.id); setIsTypeOpen(true); }} type="button">تعديل</button>
                    <button className="secondary-button compact danger" onClick={() => archiveType(expenseType)} type="button">أرشفة</button>
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

      <ModalDialog onClose={() => !isSaving && setIsCategoryOpen(false)} open={isCategoryOpen} title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف'} width="620px">
        <form className="compact-stack" onSubmit={saveCategory}>
          <label>
            اسم التصنيف
            <input defaultValue={editingCategory?.name ?? ''} name="name" required />
          </label>
          <label>
            طبيعة التصنيف
            <select defaultValue={editingCategory?.classification ?? 'miscellaneous'} name="classification">
              <option value="operating">تشغيلية</option>
              <option value="miscellaneous">متفرقة</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input defaultChecked={editingCategory?.isActive ?? true} name="isActive" type="checkbox" />
            نشط
          </label>
          <label>
            ملاحظات
            <textarea defaultValue={editingCategory?.notes ?? ''} name="notes" rows={2} />
          </label>
          <div className="compact-actions-bar">
            <button className="secondary-button compact" onClick={() => setIsCategoryOpen(false)} type="button">إلغاء</button>
            <button disabled={isSaving} type="submit">{isSaving ? 'جارٍ الحفظ...' : editingCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}</button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog onClose={() => !isSaving && setIsTypeOpen(false)} open={isTypeOpen} title={editingType ? 'تعديل النوع' : 'إضافة نوع'} width="620px">
        <form className="compact-stack" onSubmit={saveType}>
          <label>
            التصنيف
            <select defaultValue={editingType?.categoryId ?? selectedCategoryId} name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            اسم النوع
            <input defaultValue={editingType?.name ?? ''} name="name" required />
          </label>
          <label>
            الرمز
            <input defaultValue={editingType?.code ?? ''} name="code" placeholder="اختياري" />
          </label>
          <label className="checkbox-field">
            <input defaultChecked={editingType?.isActive ?? true} name="isActive" type="checkbox" />
            نشط
          </label>
          <label>
            ملاحظات
            <textarea defaultValue={editingType?.notes ?? ''} name="notes" rows={2} />
          </label>
          <div className="compact-actions-bar">
            <button className="secondary-button compact" onClick={() => setIsTypeOpen(false)} type="button">إلغاء</button>
            <button disabled={isSaving} type="submit">{isSaving ? 'جارٍ الحفظ...' : editingType ? 'حفظ التعديل' : 'إضافة النوع'}</button>
          </div>
        </form>
      </ModalDialog>
    </section>
  );
}
