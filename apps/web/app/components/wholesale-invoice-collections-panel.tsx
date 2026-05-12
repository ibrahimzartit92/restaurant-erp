'use client';

import Link from 'next/link';
import { startTransition, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import type { BankAccountOption, DrawerOption, VaultOption, WholesaleSalesInvoiceSummary } from '../lib/types';
import { ActionToast } from './action-toast';
import { ModalDialog } from './modal-dialog';
import { TransferWholesaleCashForm } from './wholesale-sales-actions';

type CollectionDestinationMode = 'cash' | 'vault' | 'bank';

type CollectionFormState = {
  paymentDate: string;
  amount: string;
  destinationMode: CollectionDestinationMode;
  drawerId: string;
  vaultId: string;
  bankAccountId: string;
  referenceNumber: string;
  notes: string;
};

function collectionDestination(payment: NonNullable<WholesaleSalesInvoiceSummary['payments']>[number]) {
  if (payment.paymentMethod === 'cash') return payment.drawer?.name ? `درج: ${payment.drawer.name}` : 'درج';
  if (payment.paymentMethod === 'vault') return payment.vault?.name ? `خزنة: ${payment.vault.name}` : 'خزنة';
  return payment.bankAccount?.name ? `حساب بنكي: ${payment.bankAccount.name}` : 'حساب بنكي';
}

function paymentMethodLabel(method: 'cash' | 'vault' | 'bank') {
  if (method === 'cash') return 'نقدي';
  if (method === 'vault') return 'خزنة';
  return 'بنكي';
}

function formatDate(value?: string | null) {
  if (!value) return 'غير محدد';
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(value));
}

function formatMoney(value?: number | string | null) {
  return formatMoneyWithCurrency(value);
}

function defaultCollectionState(amount = ''): CollectionFormState {
  return {
    paymentDate: new Date().toISOString().slice(0, 10),
    amount,
    destinationMode: 'cash',
    drawerId: '',
    vaultId: '',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
  };
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
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [formState, setFormState] = useState<CollectionFormState>(defaultCollectionState());

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

  function openSettleModal() {
    setToast((current) => ({ ...current, message: null }));
    setFormState(defaultCollectionState(String(Number(invoice.remainingAmount ?? 0))));
    setIsSettleOpen(true);
  }

  function openNewModal() {
    setToast((current) => ({ ...current, message: null }));
    setFormState(defaultCollectionState());
    setIsNewOpen(true);
  }

  function closeCollectionModal() {
    if (isSavingCollection) return;
    setIsSettleOpen(false);
    setIsNewOpen(false);
  }

  function updateForm(patch: Partial<CollectionFormState>) {
    setFormState((current) => ({ ...current, ...patch }));
  }

  async function saveCollection() {
    const amount = Number(formState.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setToast({ tone: 'danger', message: 'أدخل مبلغ تحصيل صحيحًا.' });
      return;
    }
    if (amount > Number(invoice.remainingAmount ?? 0)) {
      setToast({ tone: 'danger', message: 'مبلغ التحصيل لا يمكن أن يتجاوز المتبقي من الفاتورة.' });
      return;
    }
    if (formState.destinationMode === 'cash' && !formState.drawerId) {
      setToast({ tone: 'danger', message: 'اختر الدرج المستلم.' });
      return;
    }
    if (formState.destinationMode === 'vault' && !formState.vaultId) {
      setToast({ tone: 'danger', message: 'اختر الخزنة المستلمة.' });
      return;
    }
    if (formState.destinationMode === 'bank' && !formState.bankAccountId) {
      setToast({ tone: 'danger', message: 'اختر الحساب البنكي المستلم.' });
      return;
    }

    setIsSavingCollection(true);
    setToast({ tone: 'success', message: null });

    try {
      await submitJson(`/wholesale-sales-invoices/${invoice.id}/payments`, 'POST', {
        invoiceId: invoice.id,
        branchId: invoice.branchId,
        paymentDate: formState.paymentDate,
        paymentMethod: formState.destinationMode,
        drawerId: formState.destinationMode === 'cash' ? formState.drawerId : null,
        vaultId: formState.destinationMode === 'vault' ? formState.vaultId : null,
        bankAccountId: formState.destinationMode === 'bank' ? formState.bankAccountId : null,
        amount,
        referenceNumber: formState.referenceNumber.trim() || null,
        notes: formState.notes.trim() || null,
      });
      setIsSettleOpen(false);
      setIsNewOpen(false);
      await refreshInvoice();
      setFormState(defaultCollectionState());
      setToast({ tone: 'success', message: 'تم تسجيل التحصيل وتحديث بيانات الفاتورة مباشرة.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر تسجيل التحصيل.' });
    } finally {
      setIsSavingCollection(false);
    }
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
            <h3>إدارة التحصيلات</h3>
            <p>ابدأ بالتحصيل من الأزرار السريعة، ثم راجع السطور المسجلة مباشرة أسفل الملخص.</p>
          </div>
          <div className="compact-actions-bar">
            {Number(invoice.remainingAmount ?? 0) > 0 ? (
              <button className="primary-button compact" onClick={openSettleModal} type="button">
                تحصيل المتبقي
              </button>
            ) : null}
            <button className="secondary-button compact" onClick={openNewModal} type="button">
              إضافة تحصيل جديد
            </button>
          </div>
        </div>

        <div className="payroll-amount-grid">
          <span className="payroll-amount">
            <small>إجمالي المحصل</small>
            <strong>{formatMoney(invoice.paidAmount)}</strong>
          </span>
          <span className="payroll-amount">
            <small>المتبقي للتحصيل</small>
            <strong>{formatMoney(invoice.remainingAmount)}</strong>
          </span>
          <span className="payroll-amount">
            <small>النقد الموجود في الدرج</small>
            <strong>{formatMoney(transferableCash)}</strong>
          </span>
        </div>

        {invoice.payments?.length ? (
          <section className="table-wrap compact-table-rows">
            <table>
              <thead>
                <tr>
                  <th>رقم التحصيل</th>
                  <th>التاريخ</th>
                  <th>المبلغ</th>
                  <th>النوع</th>
                  <th>الجهة المستلمة</th>
                  <th>المرجع</th>
                  <th>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paymentNumber}</td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{paymentMethodLabel(payment.paymentMethod)}</td>
                    <td>{collectionDestination(payment)}</td>
                    <td>{payment.referenceNumber ?? '-'}</td>
                    <td>{payment.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <p className="notice">لا توجد تحصيلات مسجلة على هذه الفاتورة حتى الآن.</p>
        )}
      </section>

      <section className="payroll-card">
        <div className="payroll-card-header">
          <div>
            <span>التحصيل النقدي في الدرج</span>
            <h3>{formatMoney(transferableCash)}</h3>
            <p>يمكن تحويل النقد المحصل من الدرج إلى خزنة مختارة بعد تسجيل التحصيلات.</p>
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

      <ModalDialog
        onClose={closeCollectionModal}
        open={isSettleOpen || isNewOpen}
        title={isSettleOpen ? 'تحصيل المتبقي' : 'إضافة تحصيل جديد'}
        width="900px"
      >
        <div className="modal-form-grid">
          <section className="modal-form-section">
            <div className="modal-form-section-title">
              <strong>بيانات التحصيل</strong>
              <span>أدخل التاريخ والمبلغ المناسب قبل اختيار جهة التحصيل.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              <label>
                تاريخ التحصيل
                <input
                  onChange={(event) => updateForm({ paymentDate: event.target.value })}
                  type="date"
                  value={formState.paymentDate}
                />
              </label>
              <label>
                المبلغ
                <input
                  min="0.01"
                  onChange={(event) => updateForm({ amount: event.target.value })}
                  step="0.01"
                  type="number"
                  value={formState.amount}
                />
              </label>
              <label>
                نوع التحصيل
                <select
                  onChange={(event) =>
                    updateForm({
                      destinationMode: event.target.value as CollectionDestinationMode,
                      drawerId: '',
                      vaultId: '',
                      bankAccountId: '',
                    })
                  }
                  value={formState.destinationMode}
                >
                  <option value="cash">تحصيل إلى الدرج</option>
                  <option value="vault">تحصيل إلى الخزنة</option>
                  <option value="bank">تحصيل بنكي</option>
                </select>
              </label>
            </div>
          </section>

          <section className="modal-form-section">
            <div className="modal-form-section-title">
              <strong>جهة التحصيل</strong>
              <span>تظهر الحقول المناسبة حسب نوع التحصيل المحدد.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              {formState.destinationMode === 'cash' ? (
                <label>
                  الدرج
                  <select onChange={(event) => updateForm({ drawerId: event.target.value })} value={formState.drawerId}>
                    <option value="">اختر الدرج</option>
                    {drawers.map((drawer) => (
                      <option key={drawer.id} value={drawer.id}>
                        {drawer.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {formState.destinationMode === 'vault' ? (
                <label>
                  الخزنة
                  <select onChange={(event) => updateForm({ vaultId: event.target.value })} value={formState.vaultId}>
                    <option value="">اختر الخزنة</option>
                    {vaults.map((vault) => (
                      <option key={vault.id} value={vault.id}>
                        {vault.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {formState.destinationMode === 'bank' ? (
                <label>
                  الحساب البنكي
                  <select onChange={(event) => updateForm({ bankAccountId: event.target.value })} value={formState.bankAccountId}>
                    <option value="">اختر الحساب البنكي</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                رقم المرجع
                <input
                  maxLength={120}
                  onChange={(event) => updateForm({ referenceNumber: event.target.value })}
                  value={formState.referenceNumber}
                />
              </label>
            </div>
          </section>

          <section className="modal-form-section">
            <div className="modal-form-section-title">
              <strong>ملاحظات</strong>
              <span>أضف أي توضيح مختصر مرتبط بعملية التحصيل عند الحاجة.</span>
            </div>
            <label className="full-span">
              ملاحظات
              <textarea onChange={(event) => updateForm({ notes: event.target.value })} rows={3} value={formState.notes} />
            </label>
          </section>

          <div className="modal-form-actions">
            <button className="secondary-button compact" onClick={closeCollectionModal} type="button">
              إلغاء
            </button>
            <button disabled={isSavingCollection} onClick={() => void saveCollection()} type="button">
              {isSavingCollection ? 'جارٍ تسجيل التحصيل...' : isSettleOpen ? 'حفظ التحصيل المتبقي' : 'حفظ التحصيل'}
            </button>
          </div>
        </div>
      </ModalDialog>
    </>
  );
}
