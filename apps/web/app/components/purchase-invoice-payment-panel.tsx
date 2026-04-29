'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption } from '../lib/types';

type PaymentMode = 'add' | 'settle' | null;
type PaymentMethod = 'cash' | 'bank';

function formatMoney(value: number, currencySymbol: string, decimalPlaces: number) {
  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value) + ` ${currencySymbol}`;
}

export function PurchaseInvoicePaymentPanel({
  invoiceId,
  branchId,
  remainingAmount,
  drawers,
  bankAccounts,
  currencySymbol = 'ر.س',
  decimalPlaces = 2,
}: Readonly<{
  invoiceId: string;
  branchId: string;
  remainingAmount: number;
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  currencySymbol?: string;
  decimalPlaces?: number;
}>) {
  const router = useRouter();
  const [mode, setMode] = useState<PaymentMode>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openAddPayment() {
    setMode('add');
    setAmount('');
    setMessage(null);
  }

  function openSettleRemaining() {
    setMode('settle');
    setAmount(String(remainingAmount));
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const numericAmount = Number(amount);
    const drawerId = String(formData.get('drawerId') ?? '') || null;
    const bankAccountId = String(formData.get('bankAccountId') ?? '') || null;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('أدخل مبلغ دفعة صحيح.');
      setIsSaving(false);
      return;
    }

    if (numericAmount > remainingAmount) {
      setMessage('مبلغ الدفعة لا يمكن أن يتجاوز المتبقي من الفاتورة.');
      setIsSaving(false);
      return;
    }

    if (paymentMethod === 'cash' && !drawerId) {
      setMessage('اختر الدرج النقدي للدفعة النقدية.');
      setIsSaving(false);
      return;
    }

    if (paymentMethod === 'bank' && !bankAccountId) {
      setMessage('اختر الحساب البنكي للدفعة البنكية.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(`/purchase-invoices/${invoiceId}/payments`, 'POST', {
        branchId,
        paymentDate: String(formData.get('paymentDate') ?? ''),
        paymentMethod,
        drawerId: paymentMethod === 'cash' ? drawerId : null,
        bankAccountId: paymentMethod === 'bank' ? bankAccountId : null,
        amount: numericAmount,
        referenceNumber: String(formData.get('referenceNumber') ?? '') || null,
        notes: String(formData.get('notes') ?? '') || null,
      });
      setMode(null);
      setAmount('');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الدفعة.');
    } finally {
      setIsSaving(false);
    }
  }

  if (remainingAmount <= 0) {
    return <p className="notice success">تم تسديد الفاتورة بالكامل.</p>;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>إجراءات الدفع</h3>
          <span>الدفعات هنا تُضاف إلى هذه الفاتورة فقط ولا تنشئ فاتورة جديدة.</span>
        </div>
        <strong>المتبقي {formatMoney(remainingAmount, currencySymbol, decimalPlaces)}</strong>
      </div>

      <div className="form-actions">
        <button className="secondary-button" onClick={openAddPayment} type="button">
          إضافة دفعة
        </button>
        <button className="secondary-button" onClick={openSettleRemaining} type="button">
          تسديد المتبقي
        </button>
      </div>

      {mode ? (
        <form className="form-panel" onSubmit={handleSubmit}>
          {message ? <p className="notice danger">{message}</p> : null}
          <div className="panel-heading">
            <h3>{mode === 'settle' ? 'تسديد المتبقي' : 'إضافة دفعة جديدة'}</h3>
            <span>اختر مصدر الدفع ثم احفظ الدفعة على الفاتورة الحالية.</span>
          </div>
          <div className="form-grid">
            <label>
              تاريخ الدفع
              <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </label>
            <label>
              طريقة الدفع
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                <option value="cash">نقدا</option>
                <option value="bank">بنكي</option>
              </select>
            </label>
            <label>
              المبلغ
              <input
                min="0.01"
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <label>
              الدرج النقدي
              <select disabled={paymentMethod !== 'cash'} name="drawerId">
                <option value="">اختر الدرج</option>
                {drawers.map((drawer) => (
                  <option key={drawer.id} value={drawer.id}>
                    {drawer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الحساب البنكي
              <select disabled={paymentMethod !== 'bank'} name="bankAccountId">
                <option value="">اختر الحساب</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              رقم المرجع
              <input maxLength={120} name="referenceNumber" placeholder="اختياري" />
            </label>
          </div>
          <label>
            ملاحظات
            <textarea name="notes" rows={3} />
          </label>
          <div className="form-actions">
            <button disabled={isSaving} type="submit">
              {isSaving ? 'جاري حفظ الدفعة...' : 'حفظ الدفعة'}
            </button>
            <button className="secondary-button" disabled={isSaving} onClick={() => setMode(null)} type="button">
              إلغاء
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
