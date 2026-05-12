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
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(initialCategories[0] ? [initialCategories[0].id] : []);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string | null }>({ tone: 'success', message: null });

  const editingCategory = categories.find((category) => category.id === editingCategoryId) ?? null;
  const editingType = expenseTypes.find((expenseType) => expenseType.id === editingTypeId) ?? null;
  const groupedTypes = useMemo(
    () =>
      categories.map((category) => ({
        category,
        types: expenseTypes.filter((expenseType) => expenseType.categoryId === category.id),
      })),
    [categories, expenseTypes],
  );

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    );
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setToast({ tone: 'success', message: null });
    setIsSaving(true);
    const formData = new FormData(form);
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
      setExpandedCategoryIds((current) => (current.includes(saved.id) ? current : [saved.id, ...current]));
      if (form.isConnected) form.reset();
      setEditingCategoryId(null);
      setIsCategoryOpen(false);
      setToast({ tone: 'success', message: editingCategoryId ? 'تم تحديث التصنيف بنجاح.' : 'تمت إضافة التصنيف بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ التصنيف.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setToast({ tone: 'success', message: null });
    setIsSaving(true);
    const formData = new FormData(form);
    const categoryId = String(formData.get('categoryId') ?? editingType?.categoryId ?? categories[0]?.id ?? '');
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
      setExpandedCategoryIds((current) => (current.includes(categoryId) ? current : [categoryId, ...current]));
      if (form.isConnected) form.reset();
      setEditingTypeId(null);
      setIsTypeOpen(false);
      setToast({ tone: 'success', message: editingTypeId ? 'تم تحديث النوع بنجاح.' : 'تمت إضافة النوع بنجاح.' });
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
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر أرشفة التصنيف.' });
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
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر أرشفة النوع.' });
    }
  }

  return (
    <>
      <ActionToast message={toast.message} tone={toast.tone} />

      <div className="compact-actions-bar">
        <button
          className="secondary-button compact"
          onClick={() => {
            setEditingCategoryId(null);
            setIsCategoryOpen(true);
          }}
          type="button"
        >
          إضافة تصنيف
        </button>
        <button
          className="secondary-button compact"
          onClick={() => {
            setEditingTypeId(null);
            setIsTypeOpen(true);
          }}
          type="button"
        >
          إضافة نوع
        </button>
        <button className="secondary-button compact" onClick={() => setIsBrowserOpen(true)} type="button">
          عرض التصنيفات
        </button>
      </div>

      <ModalDialog onClose={() => setIsBrowserOpen(false)} open={isBrowserOpen} title="متصفح التصنيفات والأنواع" width="980px">
        <div className="taxonomy-browser">
          {groupedTypes.map(({ category, types }) => {
            const expanded = expandedCategoryIds.includes(category.id);
            return (
              <section className="taxonomy-group" key={category.id}>
                <div className="taxonomy-group-header">
                  <button className="taxonomy-toggle" onClick={() => toggleCategory(category.id)} type="button">
                    <span className={`taxonomy-arrow ${expanded ? 'open' : ''}`}>▾</span>
                    <span className="taxonomy-title">
                      <strong>{category.name}</strong>
                      <small>{classificationLabel(category.classification)} - {category.isActive === false ? 'مؤرشف' : 'نشط'}</small>
                    </span>
                  </button>
                  <div className="inline-actions">
                    <button
                      className="secondary-button compact"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setIsCategoryOpen(true);
                      }}
                      type="button"
                    >
                      تعديل
                    </button>
                    <button className="secondary-button compact danger" onClick={() => archiveCategory(category)} type="button">
                      أرشفة
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="taxonomy-type-list">
                    {types.length ? (
                      types.map((expenseType) => (
                        <div className="taxonomy-type-row" key={expenseType.id}>
                          <div className="taxonomy-type-copy">
                            <strong>{expenseType.name}</strong>
                            <small>{expenseType.code || 'بدون رمز'} - {expenseType.isActive === false ? 'مؤرشف' : 'نشط'}</small>
                          </div>
                          <div className="inline-actions">
                            <button
                              className="secondary-button compact"
                              onClick={() => {
                                setEditingTypeId(expenseType.id);
                                setIsTypeOpen(true);
                              }}
                              type="button"
                            >
                              تعديل
                            </button>
                            <button className="secondary-button compact danger" onClick={() => archiveType(expenseType)} type="button">
                              أرشفة
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="taxonomy-empty">لا توجد أنواع داخل هذا التصنيف بعد.</p>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </ModalDialog>

      <ModalDialog onClose={() => !isSaving && setIsCategoryOpen(false)} open={isCategoryOpen} title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف'} width="700px">
        <form className="modal-form-grid" onSubmit={saveCategory}>
          <section className="modal-form-section full-span">
            <div className="modal-form-grid-inner two-columns">
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
            </div>
          </section>
          <label className="checkbox-field full-span">
            <input defaultChecked={editingCategory?.isActive ?? true} name="isActive" type="checkbox" />
            التصنيف نشط
          </label>
          <label className="full-span">
            ملاحظات
            <textarea defaultValue={editingCategory?.notes ?? ''} name="notes" rows={3} />
          </label>
          <div className="modal-form-actions full-span">
            <button className="secondary-button compact" onClick={() => setIsCategoryOpen(false)} type="button">
              إلغاء
            </button>
            <button disabled={isSaving} type="submit">
              {isSaving ? 'جارٍ الحفظ...' : editingCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog onClose={() => !isSaving && setIsTypeOpen(false)} open={isTypeOpen} title={editingType ? 'تعديل النوع' : 'إضافة نوع'} width="700px">
        <form className="modal-form-grid" onSubmit={saveType}>
          <section className="modal-form-section full-span">
            <div className="modal-form-grid-inner two-columns">
              <label>
                التصنيف
                <select defaultValue={editingType?.categoryId ?? categories[0]?.id ?? ''} name="categoryId" required>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
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
            </div>
          </section>
          <label className="checkbox-field full-span">
            <input defaultChecked={editingType?.isActive ?? true} name="isActive" type="checkbox" />
            النوع نشط
          </label>
          <label className="full-span">
            ملاحظات
            <textarea defaultValue={editingType?.notes ?? ''} name="notes" rows={3} />
          </label>
          <div className="modal-form-actions full-span">
            <button className="secondary-button compact" onClick={() => setIsTypeOpen(false)} type="button">
              إلغاء
            </button>
            <button disabled={isSaving} type="submit">
              {isSaving ? 'جارٍ الحفظ...' : editingType ? 'حفظ التعديل' : 'إضافة النوع'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
