'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DrawerOption, PurchaseInvoiceOption, VaultOption } from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
  type UnifiedPaymentRow,
} from './payment-source-rows';

export function SupplierPaymentBatchForm({
  invoices,
  branches,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  invoices: PurchaseInvoiceOption[];
  branches: BranchOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
}>) {
  const router = useRouter();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [rows, setRows] = useState<UnifiedPaymentRow[]>([createPaymentRow()]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  );
  const paidTotal = paymentRowsTotal(rows);
  const remainingAmount = Number(selectedInvoice?.remainingAmount ?? 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const validationMessage = validatePaymentRows(rows);

    if (validationMessage) {
      setMessage(validationMessage);
      setIsSaving(false);
      return;
    }

    if (remainingAmount > 0 && paidTotal > remainingAmount) {
      setMessage('مجموع الدفعات لا يمكن أن يتجاوز المتبقي من الفاتورة.');
      setIsSaving(false);
      return;
    }

    const payments = activePaymentRows(rows).map(toBackendPayment);

    try {
      await submitJson('/supplier-payments/batch', 'POST', {
        purchaseInvoiceId: selectedInvoiceId,
        branchId: String(formData.get('branchId') ?? ''),
        paymentDate: payments[0]?.paymentDate ?? new Date().toISOString().slice(0, 10),
        notes: String(formData.get('notes') ?? '') || null,
        payments,
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
          <select name="purchaseInvoiceId" value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} required>
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
          <select name="branchId" defaultValue={selectedInvoice?.branchId ?? ''} required>
            <option value="">اختر الفرع المطابق للفاتورة</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          إجمالي الدفعات
          <input disabled value={paidTotal.toFixed(2)} />
        </label>
        <label>
          المتبقي في الفاتورة
          <input disabled value={remainingAmount.toFixed(2)} />
        </label>
      </div>

      <PaymentSourceRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        title="دفعات المورد"
        description="يمكن تقسيم الدفع بين الدرج، البنك، والخزنة مع تاريخ ومرجع لكل دفعة."
        totalAmount={remainingAmount}
        showRemaining
        allowSettleRemaining
      />

      <label>
        ملاحظات عامة
        <textarea name="notes" rows={3} />
      </label>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : 'حفظ دفعات المورد'}
        </button>
      </div>
    </form>
  );
}
