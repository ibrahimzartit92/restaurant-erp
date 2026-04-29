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

type ExpensePaymentRow = {
  paymentMethod: 'cash' | 'bank';
  drawerId: string;
  bankAccountId: string;
  amount: string;
  referenceNumber: string;
  notes: string;
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
  paymentAllocations?: ExpensePaymentRow[] | null;
  isFixed?: boolean;
  templateId?: string | null;
  notes?: string | null;
};

function emptyPaymentRow(): ExpensePaymentRow {
  return { paymentMethod: 'cash', drawerId: '', bankAccountId: '', amount: '', referenceNumber: '', notes: '' };
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  const initialRows =
    initialExpense?.paymentAllocations?.length
      ? initialExpense.paymentAllocations.map((row) => ({
          paymentMethod: row.paymentMethod,
          drawerId: row.drawerId ?? '',
          bankAccountId: row.bankAccountId ?? '',
          amount: String(row.amount ?? ''),
          referenceNumber: row.referenceNumber ?? '',
          notes: row.notes ?? '',
        }))
      : [
          {
            ...emptyPaymentRow(),
            paymentMethod: initialExpense?.paymentMethod === 'bank' ? 'bank' : 'cash',
            drawerId: initialExpense?.drawerId ?? '',
            bankAccountId: initialExpense?.bankAccountId ?? '',
            amount: initialExpense?.amount ? String(initialExpense.amount) : '',
          } as ExpensePaymentRow,
        ];
  const [paymentRows, setPaymentRows] = useState<ExpensePaymentRow[]>(initialRows);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const paidTotal = paymentRows.reduce((sum, row) => sum + asNumber(row.amount), 0);

  function updatePaymentRow(index: number, patch: Partial<ExpensePaymentRow>) {
    setPaymentRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get('amount') ?? 0);
    const activeRows = paymentRows.filter((row) => asNumber(row.amount) > 0);
    const invalidRow = activeRows.find(
      (row) => (row.paymentMethod === 'cash' && !row.drawerId) || (row.paymentMethod === 'bank' && !row.bankAccountId),
    );

    if (Math.round((paidTotal + Number.EPSILON) * 100) / 100 !== Math.round((amount + Number.EPSILON) * 100) / 100) {
      setMessage('يجب أن يساوي مجموع دفعات المصروف مبلغ المصروف.');
      setIsSaving(false);
      return;
    }

    if (invalidRow) {
      setMessage('اختر الدرج للدفعات النقدية والحساب البنكي للدفعات البنكية.');
      setIsSaving(false);
      return;
    }

    const payload = {
      expenseDate: String(formData.get('expenseDate') ?? ''),
      branchId: String(formData.get('branchId') ?? ''),
      expenseCategoryId: String(formData.get('expenseCategoryId') ?? '') || null,
      title: String(formData.get('title') ?? '') || null,
      amount,
      payments: activeRows.map((row) => ({
        paymentMethod: row.paymentMethod,
        drawerId: row.paymentMethod === 'cash' ? row.drawerId : null,
        bankAccountId: row.paymentMethod === 'bank' ? row.bankAccountId : null,
        amount: asNumber(row.amount),
        referenceNumber: row.referenceNumber.trim() || null,
        notes: row.notes.trim() || null,
      })),
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
    const messageText = reverseFinancialEffect
      ? 'سيتم حذف المصروف وتسجيل حركات عكسية لإرجاع المبالغ. هل تريد المتابعة؟'
      : 'سيتم حذف المصروف وحركاته المالية الأصلية. هل تريد المتابعة؟';
    if (!confirm(messageText)) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/expenses/${initialExpense.id}?reverse_financial_effect=${reverseFinancialEffect}`, 'DELETE', {});
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
          <input name="expenseDate" type="date" defaultValue={initialExpense?.expenseDate ?? ''} required />
        </label>
        <label>
          الفرع
          <select name="branchId" defaultValue={initialExpense?.branchId ?? ''} required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          نوع المصروف
          <select name="expenseCategoryId" defaultValue={initialExpense?.expenseCategoryId ?? ''}>
            <option value="">تصنيف عام</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          القالب
          <select name="templateId" defaultValue={initialExpense?.templateId ?? ''}>
            <option value="">بدون قالب</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <label>
          العنوان
          <input name="title" defaultValue={initialExpense?.title ?? ''} placeholder="اختياري" />
        </label>
        <label>
          مبلغ المصروف
          <input name="amount" type="number" min="0.01" step="0.01" defaultValue={initialExpense?.amount ?? ''} required />
        </label>
        <label>
          إجمالي الدفعات
          <input disabled value={paidTotal.toFixed(2)} />
        </label>
        <label className="checkbox-field">
          <input name="isFixed" type="checkbox" defaultChecked={initialExpense?.isFixed ?? false} />
          مصروف ثابت
        </label>
      </div>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>مصادر الدفع</h3>
            <span>قسّم المصروف بين الدرج النقدي والحساب البنكي عند الحاجة.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setPaymentRows((current) => [...current, emptyPaymentRow()])}>
            إضافة دفعة جديدة
          </button>
        </div>
        <div className="transfer-items-list">
          {paymentRows.map((row, index) => (
            <article className="transfer-item-card" key={index}>
              <div className="transfer-item-grid">
                <label>
                  الطريقة
                  <select value={row.paymentMethod} onChange={(event) => updatePaymentRow(index, { paymentMethod: event.target.value as ExpensePaymentRow['paymentMethod'] })}>
                    <option value="cash">نقدا</option>
                    <option value="bank">بنكي</option>
                  </select>
                </label>
                <label>
                  المبلغ
                  <input type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updatePaymentRow(index, { amount: event.target.value })} />
                </label>
                <label>
                  الدرج النقدي
                  <select value={row.drawerId} disabled={row.paymentMethod !== 'cash'} onChange={(event) => updatePaymentRow(index, { drawerId: event.target.value })}>
                    <option value="">اختر الدرج</option>
                    {drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}
                  </select>
                </label>
                <label>
                  الحساب البنكي
                  <select value={row.bankAccountId} disabled={row.paymentMethod !== 'bank'} onChange={(event) => updatePaymentRow(index, { bankAccountId: event.target.value })}>
                    <option value="">اختر الحساب</option>
                    {bankAccounts.map((bankAccount) => <option key={bankAccount.id} value={bankAccount.id}>{bankAccount.name}</option>)}
                  </select>
                </label>
                <label>
                  المرجع
                  <input maxLength={120} value={row.referenceNumber} onChange={(event) => updatePaymentRow(index, { referenceNumber: event.target.value })} />
                </label>
              </div>
              <label>
                ملاحظات الدفعة
                <textarea rows={2} value={row.notes} onChange={(event) => updatePaymentRow(index, { notes: event.target.value })} />
              </label>
              <button className="secondary-button" type="button" onClick={() => setPaymentRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))}>
                حذف الدفعة
              </button>
            </article>
          ))}
        </div>
      </section>

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialExpense?.notes ?? ''} rows={4} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>{isSaving ? 'جار الحفظ...' : 'حفظ المصروف'}</button>
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
