'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson, submitWriteJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DrawerOption, ExpenseCategoryOption, ExpenseTypeOption, VaultOption } from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
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
  expenseTypeId?: string | null;
  title?: string;
  amount?: number;
  paymentAllocations?: ExpensePaymentAllocation[] | null;
  isFixed?: boolean;
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

export function ExpenseForm({
  mode,
  initialExpense,
  branches,
  categories,
  expenseTypes,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  mode: 'create' | 'edit';
  initialExpense?: ExpenseFormRecord | null;
  branches: BranchOption[];
  categories: ExpenseCategoryOption[];
  expenseTypes: ExpenseTypeOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
}>) {
  const router = useRouter();
  const initialExpenseDate = initialExpense?.expenseDate ?? new Date().toISOString().slice(0, 10);
  const activeCategories = categories.filter((category) => category.isActive !== false || category.id === initialExpense?.expenseCategoryId);
  const activeExpenseTypes = expenseTypes.filter((expenseType) => expenseType.isActive !== false || expenseType.id === initialExpense?.expenseTypeId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialExpense?.expenseCategoryId ?? activeCategories[0]?.id ?? '');
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState(initialExpense?.expenseTypeId ?? '');
  const filteredExpenseTypes = activeExpenseTypes.filter((expenseType) => expenseType.categoryId === selectedCategoryId);
  const initialRows = useMemo(
    () =>
      initialExpense?.paymentAllocations?.length
        ? initialExpense.paymentAllocations.map((row) => fromBackendPayment(row, initialExpenseDate))
        : [createPaymentRow(initialExpenseDate, '')],
    [initialExpense, initialExpenseDate],
  );
  const [amount, setAmount] = useState(String(initialExpense?.amount ?? ''));
  const [rows, setRows] = useState<UnifiedPaymentRow[]>(initialRows);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const numericAmount = Number(amount || 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const selectedRows = activePaymentRows(rows);
    const validationMessage = selectedRows.length ? validatePaymentRows(rows) : null;
    const paidTotal = paymentRowsTotal(selectedRows);

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

    if (Math.round((paidTotal + Number.EPSILON) * 100) / 100 > Math.round((numericAmount + Number.EPSILON) * 100) / 100) {
      setMessage('لا يمكن أن يتجاوز مجموع المدفوعات مبلغ المصروف.');
      setIsSaving(false);
      return;
    }

    const expenseTypeId = String(formData.get('expenseTypeId') ?? '');
    if (!expenseTypeId) {
      setMessage('اختر نوع المصروف.');
      setIsSaving(false);
      return;
    }

    const payload = {
      expenseDate: String(formData.get('expenseDate') ?? ''),
      branchId: String(formData.get('branchId') ?? ''),
      expenseTypeId,
      title: String(formData.get('title') ?? '') || null,
      amount: numericAmount,
      payments: selectedRows.map((row) =>
        toBackendPayment({
          ...row,
          paymentDate: mode === 'edit' && row.paymentDate === initialExpenseDate ? String(formData.get('expenseDate') ?? '') : row.paymentDate,
        }),
      ),
      isFixed: formData.get('isFixed') === 'on',
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      if (mode === 'create') {
        await submitJson('/expenses', 'POST', payload);
      } else {
        await submitWriteJson(`/expenses/${initialExpense?.id}`, 'PATCH', payload);
      }
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
      ? 'سيتم حذف المصروف وتسجيل حركة عكسية للمبالغ المدفوعة فعليًا. هل تريد المتابعة؟'
      : 'سيتم حذف المصروف وإزالة حركاته المالية المسجلة. هل تريد المتابعة؟';
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
          تصنيف المصروف
          <select
            name="expenseCategoryId"
            value={selectedCategoryId}
            onChange={(event) => {
              setSelectedCategoryId(event.target.value);
              setSelectedExpenseTypeId('');
            }}
            required
          >
            <option value="">اختر التصنيف</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع المصروف
          <select
            name="expenseTypeId"
            value={selectedExpenseTypeId || filteredExpenseTypes[0]?.id || ''}
            onChange={(event) => setSelectedExpenseTypeId(event.target.value)}
            required
          >
            <option value="">اختر النوع</option>
            {filteredExpenseTypes.map((expenseType) => (
              <option key={expenseType.id} value={expenseType.id}>
                {expenseType.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          العنوان
          <input name="title" defaultValue={initialExpense?.title ?? ''} placeholder="اختياري" />
        </label>
        <label>
          إجمالي تكلفة المصروف
          <input name="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <label className="checkbox-field">
          <input name="isFixed" type="checkbox" defaultChecked={initialExpense?.isFixed ?? false} />
          مصروف تشغيلي
        </label>
      </div>

      <PaymentSourceRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        totalAmount={Number.isFinite(numericAmount) ? numericAmount : 0}
        title="المدفوعات الفعلية"
        description="أضف المبالغ المدفوعة فعليًا فقط. إذا لم يتم دفع المصروف بعد فاترك المدفوعات فارغة وسيظهر كغير مدفوع."
        showRemaining
      />

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialExpense?.notes ?? ''} rows={4} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'حفظ المصروف'}
        </button>
        {mode === 'edit' ? (
          <>
            <button className="secondary-button" type="button" disabled={isSaving} onClick={() => handleDelete(false)}>
              حذف مع إزالة الحركات
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
