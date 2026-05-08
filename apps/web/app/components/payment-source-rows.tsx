'use client';

import type { BankAccountOption, DrawerOption, VaultOption } from '../lib/types';

export type PaymentSourceType = 'drawer' | 'bank' | 'vault';

export type UnifiedPaymentRow = {
  sourceType: PaymentSourceType;
  drawerId: string;
  bankAccountId: string;
  vaultId: string;
  amount: string;
  paymentDate: string;
  referenceNumber: string;
  notes: string;
};

export function createPaymentRow(paymentDate = new Date().toISOString().slice(0, 10), amount = ''): UnifiedPaymentRow {
  return {
    sourceType: 'drawer',
    drawerId: '',
    bankAccountId: '',
    vaultId: '',
    amount,
    paymentDate,
    referenceNumber: '',
    notes: '',
  };
}

export function paymentRowAmount(row: Pick<UnifiedPaymentRow, 'amount'>) {
  const parsed = Number(row.amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function activePaymentRows(rows: UnifiedPaymentRow[]) {
  return rows.filter((row) => paymentRowAmount(row) > 0);
}

export function paymentRowsTotal(rows: UnifiedPaymentRow[]) {
  return rows.reduce((sum, row) => sum + paymentRowAmount(row), 0);
}

export function validatePaymentRows(rows: UnifiedPaymentRow[]) {
  const activeRows = activePaymentRows(rows);

  if (!activeRows.length) {
    return 'أضف دفعة واحدة على الأقل.';
  }

  const invalidRow = activeRows.find(
    (row) =>
      (row.sourceType === 'drawer' && !row.drawerId) ||
      (row.sourceType === 'bank' && !row.bankAccountId) ||
      (row.sourceType === 'vault' && !row.vaultId),
  );

  return invalidRow ? 'اختر مصدر الدفع المناسب لكل دفعة.' : null;
}

export function toBackendPayment(row: UnifiedPaymentRow) {
  return {
    paymentMethod: row.sourceType === 'drawer' ? 'cash' : row.sourceType,
    drawerId: row.sourceType === 'drawer' ? row.drawerId : null,
    bankAccountId: row.sourceType === 'bank' ? row.bankAccountId : null,
    vaultId: row.sourceType === 'vault' ? row.vaultId : null,
    amount: paymentRowAmount(row),
    paymentDate: row.paymentDate,
    referenceNumber: row.referenceNumber.trim() || null,
    notes: row.notes.trim() || null,
  };
}

export function PaymentSourceRows({
  rows,
  onChange,
  drawers,
  bankAccounts,
  vaults,
  title = 'مصادر الدفع',
  description = 'يمكن تقسيم الدفع بين الدرج والحساب البنكي والخزنة.',
  totalAmount,
  currencySymbol = '',
  decimalPlaces = 2,
  showRemaining = false,
  showPaymentDate = true,
  allowSettleRemaining = false,
  allowedSources = ['drawer', 'bank', 'vault'],
}: Readonly<{
  rows: UnifiedPaymentRow[];
  onChange: (rows: UnifiedPaymentRow[]) => void;
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  title?: string;
  description?: string;
  totalAmount?: number;
  currencySymbol?: string;
  decimalPlaces?: number;
  showRemaining?: boolean;
  showPaymentDate?: boolean;
  allowSettleRemaining?: boolean;
  allowedSources?: PaymentSourceType[];
}>) {
  const paidTotal = paymentRowsTotal(rows);
  const remainingAmount = Math.max(Number(totalAmount ?? 0) - paidTotal, 0);

  function formatMoney(value: number) {
    return `${new Intl.NumberFormat('ar', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value)} ${currencySymbol}`.trim();
  }

  function updateRow(index: number, patch: Partial<UnifiedPaymentRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow(amount = '') {
    onChange([createPaymentRow(rows[0]?.paymentDate, amount), ...rows]);
  }

  function settleRemaining() {
    if (remainingAmount <= 0) return;
    addRow(String(remainingAmount));
  }

  return (
    <section className="transfer-items-section">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>
        <div className="inline-actions">
          {allowSettleRemaining ? (
            <button className="secondary-button" type="button" onClick={settleRemaining}>
              تسديد المتبقي
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={() => addRow()}>
            إضافة دفعة جديدة
          </button>
        </div>
      </div>

      <div className="summary-grid compact-summary">
        <article className="summary-card">
          <p>إجمالي المدفوع</p>
          <strong>{formatMoney(paidTotal)}</strong>
        </article>
        {showRemaining ? (
          <article className="summary-card">
            <p>المتبقي</p>
            <strong>{formatMoney(remainingAmount)}</strong>
          </article>
        ) : null}
      </div>

      <div className="transfer-items-list">
        {rows.map((row, index) => (
          <article className="transfer-item-card" key={index}>
            <div className="transfer-item-grid">
              <label>
                مصدر الدفع
                <select
                  value={row.sourceType}
                  onChange={(event) =>
                    updateRow(index, {
                      sourceType: event.target.value as PaymentSourceType,
                      drawerId: '',
                      bankAccountId: '',
                      vaultId: '',
                    })
                  }
                >
                  {allowedSources.includes('drawer') ? <option value="drawer">درج</option> : null}
                  {allowedSources.includes('bank') ? <option value="bank">حساب بنكي</option> : null}
                  {allowedSources.includes('vault') ? <option value="vault">خزنة</option> : null}
                </select>
              </label>
              {showPaymentDate ? (
                <label>
                  تاريخ الدفع
                  <input type="date" value={row.paymentDate} onChange={(event) => updateRow(index, { paymentDate: event.target.value })} />
                </label>
              ) : null}
              <label>
                المبلغ
                <input type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateRow(index, { amount: event.target.value })} />
              </label>
              <label>
                الدرج
                <select value={row.drawerId} disabled={row.sourceType !== 'drawer'} onChange={(event) => updateRow(index, { drawerId: event.target.value })}>
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
                <select value={row.bankAccountId} disabled={row.sourceType !== 'bank'} onChange={(event) => updateRow(index, { bankAccountId: event.target.value })}>
                  <option value="">اختر الحساب</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              {allowedSources.includes('vault') ? (
                <label>
                  الخزنة
                  <select value={row.vaultId} disabled={row.sourceType !== 'vault'} onChange={(event) => updateRow(index, { vaultId: event.target.value })}>
                    <option value="">اختر الخزنة</option>
                    {vaults.map((vault) => (
                      <option key={vault.id} value={vault.id}>
                        {vault.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                رقم المرجع
                <input maxLength={120} value={row.referenceNumber} onChange={(event) => updateRow(index, { referenceNumber: event.target.value })} />
              </label>
            </div>
            <label>
              ملاحظات الدفعة
              <textarea rows={2} value={row.notes} onChange={(event) => updateRow(index, { notes: event.target.value })} />
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChange(rows.length === 1 ? rows : rows.filter((_, rowIndex) => rowIndex !== index))}
            >
              حذف الدفعة
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
