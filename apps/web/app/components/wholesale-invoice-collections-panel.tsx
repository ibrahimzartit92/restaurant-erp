'use client';

import Link from 'next/link';
import { startTransition, useMemo, useState } from 'react';
import { fetchClientJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import type { BankAccountOption, DrawerOption, VaultOption, WholesaleSalesInvoiceSummary } from '../lib/types';
import { ActionToast } from './action-toast';
import { TransferWholesaleCashForm, WholesalePaymentBatchForm } from './wholesale-sales-actions';

function collectionDestination(payment: NonNullable<WholesaleSalesInvoiceSummary['payments']>[number]) {
  if (payment.paymentMethod === 'cash') return payment.drawer?.name ? `درج: ${payment.drawer.name}` : 'درج';
  if (payment.paymentMethod === 'vault') return payment.vault?.name ? `خزنة: ${payment.vault.name}` : 'خزنة';
  return payment.bankAccount?.name ? `حساب بنكي: ${payment.bankAccount.name}` : 'حساب بنكي';
}

function formatDate(value?: string | null) {
  if (!value) return 'غير محدد';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(value));
}

function formatMoney(value?: number | string | null) {
  return formatMoneyWithCurrency(value);
}

export function WholesaleInvoiceCollectionsPanel({
  initialInvoice,
  drawers,
  vaults,
  bankAccounts,
}: Readonly<{
  initialInvoice: WholesaleSalesInvoiceSummary;
  drawers: DrawerOption[];
  vaults: VaultOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string | null }>({
    tone: 'success',
    message: null,
  });

  const cashCollected = useMemo(
    () =>
      (invoice.payments ?? [])
        .filter((payment) => payment.paymentMethod === 'cash')
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    [invoice.payments],
  );
  const transferableCash = Math.max(cashCollected - Number(invoice.cashTransferredAmount ?? 0), 0);

  async function refreshInvoice() {
    const next = await fetchClientJson<WholesaleSalesInvoiceSummary>(`/wholesale-sales-invoices/${invoice.id}`);
    startTransition(() => setInvoice(next));
  }

  async function handleCollectionSuccess() {
    await refreshInvoice();
    setToast({ tone: 'success', message: 'تم تسجيل التحصيل وتحديث الفاتورة بنجاح.' });
  }

  async function handleTransferSuccess() {
    await refreshInvoice();
    setToast({ tone: 'success', message: 'تم تحويل النقد إلى الخزنة وتحديث الفاتورة بنجاح.' });
  }

  return (
    <>
      <ActionToast message={toast.message} tone={toast.tone} />

      <section className="payroll-card">
        <div className="payroll-card-header">
          <div>
            <span>تحصيلات الفاتورة</span>
            <h3>تسجيل تحصيل جديد</h3>
            <p>يدعم التحصيل الجزئي أو الكامل إلى الدرج أو الخزنة أو الحساب البنكي، مع تحديث فوري بعد الحفظ.</p>
          </div>
        </div>
        <WholesalePaymentBatchForm
          bankAccounts={bankAccounts}
          branchId={invoice.branchId}
          drawers={drawers}
          invoiceId={invoice.id}
          onSuccess={handleCollectionSuccess}
          remainingAmount={Number(invoice.remainingAmount ?? 0)}
          vaults={vaults}
        />
      </section>

      <section className="payroll-card">
        <div className="payroll-card-header">
          <div>
            <span>التحصيل النقدي في الدرج</span>
            <h3>{formatMoney(transferableCash)}</h3>
            <p>النقد المحصل في الدرج يبقى كتجميع نقدي حتى يتم تحويله يدويًا إلى خزنة مختارة.</p>
          </div>
          <Link className="text-link" href="/vaults">
            الخزن
          </Link>
        </div>
        <TransferWholesaleCashForm
          availableAmount={transferableCash}
          drawers={drawers}
          invoiceId={invoice.id}
          onSuccess={handleTransferSuccess}
          vaults={vaults}
        />
      </section>

      {invoice.payments?.length ? (
        <section className="table-wrap compact-table-rows">
          <table>
            <thead>
              <tr>
                <th>رقم التحصيل</th>
                <th>التاريخ</th>
                <th>الجهة المستلمة</th>
                <th>المرجع</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paymentNumber}</td>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>{collectionDestination(payment)}</td>
                  <td>{payment.referenceNumber ?? '-'}</td>
                  <td>{formatMoney(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
