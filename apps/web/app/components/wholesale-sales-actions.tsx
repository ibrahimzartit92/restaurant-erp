'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption, VaultOption } from '../lib/types';
import {
  CollectionDestinationRows,
  activeCollectionRows,
  createCollectionRow,
  toBackendCollection,
  validateCollectionRows,
  type CollectionRow,
} from './collection-destination-rows';

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
  const hasPersistedInvoiceId = invoiceId.trim().length > 0 && invoiceId !== 'new';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isSaving) return;
    if (!hasPersistedInvoiceId) {
      console.warn('Wholesale cash transfer submit blocked: missing persisted invoice id.');
      setMessage('يجب حفظ الفاتورة أولًا قبل تحويل التحصيل النقدي.');
      return;
    }
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
    return <p className="notice">لا يوجد تحصيل نقدي في الدرج متاح للتحويل إلى الخزنة لهذه الفاتورة.</p>;
  }

  return (
    <form className="form-panel" method="post" onSubmit={handleSubmit}>
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
          الخزنة المستلمة
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
  vaults,
  bankAccounts,
}: Readonly<{
  invoiceId: string;
  branchId: string;
  remainingAmount: number;
  drawers: DrawerOption[];
  vaults: VaultOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [rows, setRows] = useState<CollectionRow[]>([createCollectionRow(undefined, remainingAmount > 0 ? String(remainingAmount) : '')]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasPersistedInvoiceId = invoiceId.trim().length > 0 && invoiceId !== 'new';

  async function submitCollections() {
    if (isSaving) return;
    if (!hasPersistedInvoiceId) {
      console.warn('Wholesale collection submit blocked: missing persisted invoice id.');
      setMessage('يجب حفظ الفاتورة أولًا قبل تسجيل التحصيلات.');
      return;
    }
    const activeRows = activeCollectionRows(rows);
    const validation = validateCollectionRows(activeRows);
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
        paymentDate: activeRows[0]?.collectionDate ?? new Date().toISOString().slice(0, 10),
        payments: activeRows.map(toBackendCollection),
      });
      setRows([createCollectionRow()]);
      setMessage('تم تسجيل التحصيلات.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تسجيل التحصيلات.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    void submitCollections();
  }

  if (remainingAmount <= 0) {
    return <p className="notice success">تم تحصيل الفاتورة بالكامل.</p>;
  }

  if (!hasPersistedInvoiceId) {
    return <p className="notice warning">يجب حفظ الفاتورة أولًا قبل تسجيل التحصيلات.</p>;
  }

  return (
    <form className="stacked-sections" method="post" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('تم') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <CollectionDestinationRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        vaults={vaults}
        bankAccounts={bankAccounts}
        title="إضافة تحصيلات"
        description="سجل تحصيلًا واردًا إلى الدرج أو الخزنة أو الحساب البنكي."
        totalAmount={remainingAmount}
        showRemaining
        allowSettleRemaining
      />
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار التسجيل...' : 'تسجيل التحصيلات'}
        </button>
      </div>
    </form>
  );
}
