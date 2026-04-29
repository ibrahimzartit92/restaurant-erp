'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption } from '../lib/types';

type PaymentRow = {
  paymentMethod: 'cash' | 'bank';
  drawerId: string;
  bankAccountId: string;
  amount: string;
  referenceNumber: string;
  notes: string;
};

function emptyPayment(amount = ''): PaymentRow {
  return { paymentMethod: 'cash', drawerId: '', bankAccountId: '', amount, referenceNumber: '', notes: '' };
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PurchaseInvoicePaymentForm({
  invoiceId,
  branchId,
  remainingAmount,
  drawers,
  bankAccounts,
}: Readonly<{
  invoiceId: string;
  branchId: string;
  remainingAmount: number;
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([emptyPayment(String(remainingAmount || ''))]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const paidTotal = rows.reduce((sum, row) => sum + asNumber(row.amount), 0);

  function updateRow(index: number, patch: Partial<PaymentRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const activeRows = rows.filter((row) => asNumber(row.amount) > 0);
    const invalidRow = activeRows.find(
      (row) => (row.paymentMethod === 'cash' && !row.drawerId) || (row.paymentMethod === 'bank' && !row.bankAccountId),
    );

    if (activeRows.length === 0 || invalidRow) {
      setMessage('أضف دفعة واحدة على الأقل، واختر الدرج أو الحساب البنكي حسب طريقة الدفع.');
      setIsSaving(false);
      return;
    }

    if (paidTotal > remainingAmount) {
      setMessage('إجمالي الدفعات لا يمكن أن يتجاوز المتبقي من الفاتورة.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(`/purchase-invoices/${invoiceId}/payments/batch`, 'POST', {
        purchaseInvoiceId: invoiceId,
        branchId,
        paymentDate: String(formData.get('paymentDate') ?? ''),
        notes: String(formData.get('notes') ?? '') || null,
        payments: activeRows.map((row) => ({
          paymentMethod: row.paymentMethod,
          drawerId: row.paymentMethod === 'cash' ? row.drawerId : null,
          bankAccountId: row.paymentMethod === 'bank' ? row.bankAccountId : null,
          amount: asNumber(row.amount),
          referenceNumber: row.referenceNumber.trim() || null,
          notes: row.notes.trim() || null,
        })),
      });
      router.refresh();
      setRows([emptyPayment()]);
      setMessage('تمت إضافة الدفعة وتحديث المتبقي.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إضافة الدفعة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <h3>إضافة دفعة</h3>
          <span>يمكن تسديد المتبقي كاملا أو تسجيل دفعة جزئية نقدية أو بنكية.</span>
        </div>
        <strong>{paidTotal.toFixed(2)}</strong>
      </div>
      {message ? <p className={message.includes('تمت') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-grid">
        <label>
          تاريخ الدفع
          <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          المتبقي الحالي
          <input disabled value={remainingAmount.toFixed(2)} />
        </label>
      </div>

      <div className="transfer-items-list">
        {rows.map((row, index) => (
          <article className="transfer-item-card" key={index}>
            <div className="transfer-item-grid">
              <label>
                الطريقة
                <select value={row.paymentMethod} onChange={(event) => updateRow(index, { paymentMethod: event.target.value as PaymentRow['paymentMethod'] })}>
                  <option value="cash">نقدا</option>
                  <option value="bank">بنكي</option>
                </select>
              </label>
              <label>
                المبلغ
                <input type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateRow(index, { amount: event.target.value })} />
              </label>
              <label>
                الدرج
                <select value={row.drawerId} disabled={row.paymentMethod !== 'cash'} onChange={(event) => updateRow(index, { drawerId: event.target.value })}>
                  <option value="">اختر الدرج</option>
                  {drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}
                </select>
              </label>
              <label>
                الحساب البنكي
                <select value={row.bankAccountId} disabled={row.paymentMethod !== 'bank'} onChange={(event) => updateRow(index, { bankAccountId: event.target.value })}>
                  <option value="">اختر الحساب</option>
                  {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label>
                المرجع
                <input maxLength={120} value={row.referenceNumber} onChange={(event) => updateRow(index, { referenceNumber: event.target.value })} />
              </label>
            </div>
            <label>
              ملاحظات الدفعة
              <textarea rows={2} value={row.notes} onChange={(event) => updateRow(index, { notes: event.target.value })} />
            </label>
            <button className="secondary-button" type="button" onClick={() => setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index))}>
              حذف الدفعة
            </button>
          </article>
        ))}
      </div>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={() => setRows((current) => [...current, emptyPayment()])}>
          إضافة دفعة أخرى
        </button>
        <button className="secondary-button" type="button" onClick={() => setRows([emptyPayment(String(remainingAmount || ''))])}>
          تسديد المتبقي
        </button>
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ الدفعة'}</button>
      </div>
      <label>
        ملاحظات عامة
        <textarea name="notes" rows={3} />
      </label>
    </form>
  );
}
