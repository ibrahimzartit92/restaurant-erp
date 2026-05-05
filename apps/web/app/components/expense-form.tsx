'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ExpenseCategoryOption,
  ExpenseTemplateOption,
  VaultOption,
} from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
  type PaymentSourceType,
  type UnifiedPaymentRow,
} from './payment-source-rows';

type ExpensePaymentAllocation = {
  paymentMethod: 'cash' | 'bank' | 'vault';
  drawerId?: string | null;
  bankAccountId?: string | null;
  vaultId?: string | null;
  amount: number | string;
  paymentDate?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
};

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
  vaultId?: string | null;
  paymentAllocations?: ExpensePaymentAllocation[] | null;
  isFixed?: boolean;
  templateId?: string | null;
  notes?: string | null;
};

function fromBackendPayment(row: ExpensePaymentAllocation, fallbackDate: string): UnifiedPaymentRow {
  return {
    sourceType: row.paymentMethod === 'cash' ? 'drawer' : row.paymentMethod,
    drawerId: row.drawerId ?? '',
    bankAccountId: row.bankAccountId ?? '',
    vaultId: row.vaultId ?? '',
    amount: String(row.amount ?? ''),
    paymentDate: row.paymentDate ?? fallbackDate,
    referenceNumber: row.referenceNumber ?? '',
    notes: row.notes ?? '',
  };
}

function legacyPaymentRow(initialExpense?: ExpenseFormRecord | null): UnifiedPaymentRow {
  const paymentDate = initialExpense?.expenseDate ?? new Date().toISOString().slice(0, 10);
  const sourceType =
    initialExpense?.paymentMethod === 'bank' ? 'bank' : initialExpense?.paymentMethod === 'vault' ? 'vault' : 'drawer';

  return {
    ...createPaymentRow(paymentDate, initialExpense?.amount ? String(initialExpense.amount) : ''),
    sourceType,
    drawerId: initialExpense?.drawerId ?? '',
    bankAccountId: initialExpense?.bankAccountId ?? '',
    vaultId: initialExpense?.vaultId ?? '',
  };
}

export function ExpenseForm({
  mode,
  initialExpense,
  initialTemplateId,
  branches,
  categories,
  templates,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  mode: 'create' | 'edit';
  initialExpense?: ExpenseFormRecord | null;
  initialTemplateId?: string;
  branches: BranchOption[];
  categories: ExpenseCategoryOption[];
  templates: ExpenseTemplateOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
}>) {
  const router = useRouter();
  const initialTemplate = templates.find((template) => template.id === initialTemplateId);
  const initialExpenseDate = initialExpense?.expenseDate ?? new Date().toISOString().slice(0, 10);
  const initialRows = useMemo(
    () =>
      initialExpense?.paymentAllocations?.length
        ? initialExpense.paymentAllocations.map((row) => fromBackendPayment(row, initialExpenseDate))
        : initialTemplate && mode === 'create'
          ? [
              {
                ...createPaymentRow(initialExpenseDate, initialTemplate.defaultAmount ? String(initialTemplate.defaultAmount) : ''),
                sourceType: (
                  initialTemplate.paymentMethod === 'bank'
                    ? 'bank'
                    : initialTemplate.paymentMethod === 'vault'
                      ? 'vault'
                      : 'drawer'
                ) as PaymentSourceType,
              },
            ]
        : [legacyPaymentRow(initialExpense)],
    [initialExpense, initialExpenseDate, initialTemplate, mode],
  );
  const [amount, setAmount] = useState(String(initialExpense?.amount ?? initialTemplate?.defaultAmount ?? ''));
  const [rows, setRows] = useState<UnifiedPaymentRow[]>(initialRows);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const numericAmount = Number(amount || 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const validationMessage = validatePaymentRows(rows);
    const paidTotal = paymentRowsTotal(rows);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('أدخل مبلغ المصروف بشكل صحيح.');
      setIsSaving(false);
      return;
    }

    if (validationMessage) {
      setMessage(validationMessage);
      setIsSaving(false);
      return;
    }

    if (Math.round((paidTotal + Number.EPSILON) * 100) / 100 !== Math.round((numericAmount + Number.EPSILON) * 100) / 100) {
      setMessage('يجب أن يساوي مجموع الدفعات مبلغ المصروف.');
      setIsSaving(false);
      return;
    }

    const payload = {
      expenseDate: String(formData.get('expenseDate') ?? ''),
      branchId: String(formData.get('branchId') ?? ''),
      expenseCategoryId: String(formData.get('expenseCategoryId') ?? '') || null,
      title: String(formData.get('title') ?? '') || null,
      amount: numericAmount,
      payments: activePaymentRows(rows).map(toBackendPayment),
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

  async function handleDelete(reverseFinancialEffect: boolean) {
    if (!initialExpense?.id) return;
    const confirmation = reverseFinancialEffect
      ? 'سيتم حذف المصروف وتسجيل حركة عكسية. هل تريد المتابعة؟'
      : 'سيتم حذف المصروف. هل تريد المتابعة؟';
    if (!confirm(confirmation)) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/expenses/${initialExpense.id}/delete?reverse_financial_effect=${reverseFinancialEffect}`, 'POST', {});
      router.push('/expenses');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف المصروف.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          التاريخ
          <input name="expenseDate" type="date" defaultValue={initialExpenseDate} required />
        </label>
        <label>
          الفرع
          <select name="branchId" defaultValue={initialExpense?.branchId ?? initialTemplate?.branchId ?? ''} required>
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
          <select name="expenseCategoryId" defaultValue={initialExpense?.expenseCategoryId ?? initialTemplate?.expenseCategoryId ?? ''}>
            <option value="">تصنيف عام</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          القالب
          <select name="templateId" defaultValue={initialExpense?.templateId ?? initialTemplateId ?? ''}>
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
          <input name="title" defaultValue={initialExpense?.title ?? initialTemplate?.name ?? ''} placeholder="اختياري" />
        </label>
        <label>
          مبلغ المصروف
          <input name="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <label className="checkbox-field">
          <input name="isFixed" type="checkbox" defaultChecked={initialExpense?.isFixed ?? false} />
          مصروف ثابت
        </label>
      </div>

      <PaymentSourceRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        totalAmount={Number.isFinite(numericAmount) ? numericAmount : 0}
        title="مصادر دفع المصروف"
        description="قسم المصروف بين درج، حساب بنكي، أو خزنة. يجب أن يساوي مجموع الدفعات مبلغ المصروف."
        showRemaining
      />

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialExpense?.notes ?? initialTemplate?.notes ?? ''} rows={4} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'حفظ المصروف'}
        </button>
        {mode === 'edit' ? (
          <>
            <button className="secondary-button" type="button" disabled={isSaving} onClick={() => handleDelete(false)}>
              حذف فقط
            </button>
            <button className="secondary-button" type="button" disabled={isSaving} onClick={() => handleDelete(true)}>
              حذف مع عكس الأثر المالي
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
