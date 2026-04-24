'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
} from '../lib/types';

type ExpenseFormRecord = {
  id?: string;
  expenseDate?: string;
  branchId?: string;
  expenseCategoryId?: string;
  title?: string;
  amount?: number;
  paymentMethod?: string;
  drawerId?: string | null;
  bankAccountId?: string | null;
  isFixed?: boolean;
  templateId?: string | null;
  notes?: string | null;
};

export function ExpenseForm({
  mode,
  initialExpense,
  branches,
  categories,
  templates,
  drawers,
  bankAccounts,
}: Readonly<{
  mode: 'create' | 'edit';
  initialExpense?: ExpenseFormRecord | null;
  branches: BranchOption[];
  categories: ExpenseCategoryOption[];
  templates: ExpenseTemplateOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      expenseDate: String(formData.get('expenseDate') ?? ''),
      branchId: String(formData.get('branchId') ?? ''),
      expenseCategoryId: String(formData.get('expenseCategoryId') ?? ''),
      title: String(formData.get('title') ?? ''),
      amount: Number(formData.get('amount') ?? 0),
      paymentMethod: String(formData.get('paymentMethod') ?? 'cash'),
      drawerId: String(formData.get('drawerId') ?? '') || null,
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      isFixed: formData.get('isFixed') === 'on',
      templateId: String(formData.get('templateId') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        mode === 'create' ? '/expenses' : `/expenses/${initialExpense?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/expenses');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المصروف.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          التاريخ
          <input name="expenseDate" type="date" defaultValue={initialExpense?.expenseDate ?? ''} required />
        </label>
        <label>
          الفرع
          <select name="branchId" defaultValue={initialExpense?.branchId ?? ''} required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع المصروف
          <select name="expenseCategoryId" defaultValue={initialExpense?.expenseCategoryId ?? ''} required>
            <option value="">اختر النوع</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          القالب
          <select name="templateId" defaultValue={initialExpense?.templateId ?? ''}>
            <option value="">بدون قالب</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          العنوان
          <input name="title" defaultValue={initialExpense?.title ?? ''} required />
        </label>
        <label>
          المبلغ
          <input name="amount" type="number" min="0.01" step="0.01" defaultValue={initialExpense?.amount ?? ''} required />
        </label>
        <label>
          طريقة الدفع
          <select name="paymentMethod" defaultValue={initialExpense?.paymentMethod ?? 'cash'} required>
            <option value="cash">نقداً</option>
            <option value="bank">بنكي</option>
            <option value="other">أخرى</option>
          </select>
        </label>
        <label>
          الدرج النقدي
          <select name="drawerId" defaultValue={initialExpense?.drawerId ?? ''}>
            <option value="">غير محدد</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الحساب البنكي
          <select name="bankAccountId" defaultValue={initialExpense?.bankAccountId ?? ''}>
            <option value="">غير محدد</option>
            {bankAccounts.map((bankAccount) => (
              <option key={bankAccount.id} value={bankAccount.id}>
                {bankAccount.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-field">
          <input name="isFixed" type="checkbox" defaultChecked={initialExpense?.isFixed ?? false} />
          مصروف ثابت
        </label>
      </div>

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialExpense?.notes ?? ''} rows={4} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'حفظ المصروف'}
        </button>
      </div>
    </form>
  );
}
