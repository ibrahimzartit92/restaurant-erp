'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption, VaultOption } from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
  type UnifiedPaymentRow,
} from './payment-source-rows';

type PaymentMode = 'add' | 'settle' | null;

function formatMoney(value: number, currencySymbol: string, decimalPlaces: number) {
  return `${new Intl.NumberFormat('ar', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value)} ${currencySymbol}`.trim();
}

export function PurchaseInvoicePaymentPanel({
  invoiceId,
  branchId,
  remainingAmount,
  drawers,
  bankAccounts,
  vaults,
  currencySymbol = 'ر.س',
  decimalPlaces = 2,
}: Readonly<{
  invoiceId: string;
  branchId: string;
  remainingAmount: number;
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  currencySymbol?: string;
  decimalPlaces?: number;
}>) {
  const router = useRouter();
  const [mode, setMode] = useState<PaymentMode>(null);
  const [rows, setRows] = useState<UnifiedPaymentRow[]>([createPaymentRow()]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openAddPayment() {
    setMode('add');
    setRows([createPaymentRow()]);
    setMessage(null);
  }

  function openSettleRemaining() {
    setMode('settle');
    setRows([createPaymentRow(undefined, String(remainingAmount))]);
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const validationMessage = validatePaymentRows(rows);
    const paidTotal = paymentRowsTotal(rows);

    if (validationMessage) {
      setMessage(validationMessage);
      setIsSaving(false);
      return;
    }

    if (paidTotal > remainingAmount) {
      setMessage('مجموع الدفعات لا يمكن أن يتجاوز المتبقي من الفاتورة.');
      setIsSaving(false);
      return;
    }

    const payments = activePaymentRows(rows).map(toBackendPayment);

    try {
      await submitJson(`/purchase-invoices/${invoiceId}/payments/batch`, 'POST', {
        branchId,
        paymentDate: payments[0]?.paymentDate ?? new Date().toISOString().slice(0, 10),
        payments,
      });
      setMode(null);
      setRows([createPaymentRow()]);
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
          <span>الدفعات هنا تضاف إلى هذه الفاتورة فقط ولا تنشئ فاتورة جديدة.</span>
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
          <PaymentSourceRows
            rows={rows}
            onChange={setRows}
            drawers={drawers}
            bankAccounts={bankAccounts}
            vaults={vaults}
            title={mode === 'settle' ? 'تسديد المتبقي' : 'إضافة دفعة'}
            description="اختر مصدر الدفع لكل صف. يمكن تقسيم الدفعة بين الدرج، البنك، والخزنة."
            totalAmount={remainingAmount}
            currencySymbol={currencySymbol}
            decimalPlaces={decimalPlaces}
            showRemaining
            allowSettleRemaining={mode !== 'settle'}
          />
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
