'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DrawerOption, PurchaseInvoiceOption } from '../lib/types';

type PaymentRow = {
  paymentMethod: 'cash' | 'bank';
  drawerId: string;
  bankAccountId: string;
  amount: string;
  referenceNumber: string;
  notes: string;
};

function emptyPayment(): PaymentRow {
  return { paymentMethod: 'cash', drawerId: '', bankAccountId: '', amount: '', referenceNumber: '', notes: '' };
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SupplierPaymentBatchForm({
  invoices,
  branches,
  drawers,
  bankAccounts,
}: Readonly<{
  invoices: PurchaseInvoiceOption[];
  branches: BranchOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([emptyPayment()]);
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
      setMessage('أضف دفعة واحدة على الأقل، واختر الدرج للدفع النقدي أو الحساب البنكي للدفع البنكي.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson('/supplier-payments/batch', 'POST', {
        purchaseInvoiceId: String(formData.get('purchaseInvoiceId') ?? ''),
        branchId: String(formData.get('branchId') ?? ''),
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
      router.push('/supplier-payments');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ دفعات المورد.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          فاتورة الشراء
          <select name="purchaseInvoiceId" required>
            <option value="">اختر الفاتورة</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.supplier?.name ?? 'متفرقة'} - متبقي {invoice.remainingAmount}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select name="branchId" required>
            <option value="">اختر الفرع المطابق للفاتورة</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ الدفع
          <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          إجمالي الدفعات
          <input disabled value={paidTotal.toFixed(2)} />
        </label>
      </div>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>دفعات المورد</h3>
            <span>يمكن تقسيم الدفع بين نقدي وبنكي أو تسجيل أكثر من قسط.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setRows((current) => [...current, emptyPayment()])}>
            إضافة دفعة جديدة
          </button>
        </div>
        <div className="transfer-items-list">
          {rows.map((row, index) => (
            <article className="transfer-item-card" key={index}>
              <div className="transfer-item-grid">
                <label>
                  الطريقة
                  <select
                    value={row.paymentMethod}
                    onChange={(event) => updateRow(index, { paymentMethod: event.target.value as PaymentRow['paymentMethod'] })}
                  >
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
      </section>

      <label>
        ملاحظات عامة
        <textarea name="notes" rows={3} />
      </label>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ دفعات المورد'}</button>
      </div>
    </form>
  );
}
