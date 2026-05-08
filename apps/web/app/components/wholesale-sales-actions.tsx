'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption, VaultOption } from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  toBackendPayment,
  validatePaymentRows,
  type UnifiedPaymentRow,
} from './payment-source-rows';

export function WholesaleInvoiceStatusActions({ invoiceId, canApprove }: Readonly<{ invoiceId: string; canApprove: boolean }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function run(path: string, confirmMessage: string) {
    if (!confirm(confirmMessage)) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(path, 'POST', {});
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تنفيذ العملية.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <span className="inline-action-stack">
      <span className="inline-actions">
        {canApprove ? (
          <button className="secondary-button" disabled={isSaving} onClick={() => run(`/wholesale-sales-invoices/${invoiceId}/approve`, 'سيتم اعتماد الفاتورة وخصم المخزون من المخزن المحدد. متابعة؟')} type="button">
            اعتماد الفاتورة
          </button>
        ) : null}
        <button className="secondary-button danger" disabled={isSaving} onClick={() => run(`/wholesale-sales-invoices/${invoiceId}/cancel`, 'سيتم إلغاء الفاتورة وإزالة أثرها المخزني. متابعة؟')} type="button">
          إلغاء الفاتورة
        </button>
      </span>
      {message ? <small className="field-hint danger">{message}</small> : null}
    </span>
  );
}

export function TransferWholesaleCashForm({
  invoiceId,
  drawers,
  vaults,
  availableAmount,
}: Readonly<{
  invoiceId: string;
  drawers: DrawerOption[];
  vaults: VaultOption[];
  availableAmount: number;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    try {
      await submitJson(`/wholesale-sales-invoices/${invoiceId}/transfer-cash-to-vault`, 'POST', {
        drawerId: String(formData.get('drawerId') ?? ''),
        vaultId: String(formData.get('vaultId') ?? ''),
        amount: Number(formData.get('amount') ?? 0),
        transferDate: String(formData.get('transferDate') ?? ''),
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      setMessage('تم تحويل التحصيل النقدي إلى الخزنة.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحويل التحصيل النقدي.');
    } finally {
      setIsSaving(false);
    }
  }

  if (availableAmount <= 0) {
    return <p className="notice">لا يوجد تحصيل نقدي متاح للتحويل إلى الخزنة لهذه الفاتورة.</p>;
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('تم') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-grid">
        <label>
          الدرج المحصل منه
          <select name="drawerId" required>
            <option value="">اختر الدرج</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الخزنة
          <select name="vaultId" required>
            <option value="">اختر الخزنة</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          المبلغ
          <input defaultValue={availableAmount} max={availableAmount} min="0.01" name="amount" required step="0.01" type="number" />
        </label>
        <label>
          تاريخ التحويل
          <input defaultValue={new Date().toISOString().slice(0, 10)} name="transferDate" required type="date" />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={2} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار التحويل...' : 'تحويل التحصيل إلى الخزنة'}
        </button>
      </div>
    </form>
  );
}

export function WholesalePaymentBatchForm({
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
  const [rows, setRows] = useState<UnifiedPaymentRow[]>([createPaymentRow(undefined, remainingAmount > 0 ? String(remainingAmount) : '')]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeRows = activePaymentRows(rows);
    const validation = validatePaymentRows(activeRows);
    if (validation) {
      setMessage(validation);
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/wholesale-sales-invoices/${invoiceId}/payments/batch`, 'POST', {
        invoiceId,
        branchId,
        paymentDate: activeRows[0]?.paymentDate ?? new Date().toISOString().slice(0, 10),
        payments: activeRows.map(toBackendPayment).map((payment) => ({
          ...payment,
          paymentMethod: payment.paymentMethod === 'cash' ? 'cash' : 'bank',
        })),
      });
      setRows([createPaymentRow()]);
      setMessage('تم تسجيل الدفعات.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تسجيل الدفعات.');
    } finally {
      setIsSaving(false);
    }
  }

  if (remainingAmount <= 0) {
    return <p className="notice success">تم سداد الفاتورة بالكامل.</p>;
  }

  return (
    <form className="stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('تم') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <PaymentSourceRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={[]}
        title="إضافة دفعات"
        description="سجل تحصيلًا نقديًا في الدرج أو تحصيلًا بنكيًا للحساب. لا يتم تحويل النقد إلى الخزنة تلقائيًا."
        totalAmount={remainingAmount}
        showRemaining
        allowSettleRemaining
        allowedSources={['drawer', 'bank']}
      />
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار التسجيل...' : 'تسجيل الدفعات'}
        </button>
      </div>
    </form>
  );
}
