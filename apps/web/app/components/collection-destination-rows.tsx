'use client';

import type { BankAccountOption, DrawerOption, VaultOption } from '../lib/types';

export type CollectionDestinationType = 'drawer' | 'vault' | 'bank';

export type CollectionRow = {
  destinationType: CollectionDestinationType;
  drawerId: string;
  vaultId: string;
  bankAccountId: string;
  amount: string;
  collectionDate: string;
  referenceNumber: string;
  notes: string;
};

export function createCollectionRow(collectionDate = new Date().toISOString().slice(0, 10), amount = ''): CollectionRow {
  return {
    destinationType: 'drawer',
    drawerId: '',
    vaultId: '',
    bankAccountId: '',
    amount,
    collectionDate,
    referenceNumber: '',
    notes: '',
  };
}

export function collectionRowAmount(row: Pick<CollectionRow, 'amount'>) {
  const parsed = Number(row.amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function activeCollectionRows(rows: CollectionRow[]) {
  return rows.filter((row) => collectionRowAmount(row) > 0);
}

export function collectionRowsTotal(rows: CollectionRow[]) {
  return rows.reduce((sum, row) => sum + collectionRowAmount(row), 0);
}

export function validateCollectionRows(rows: CollectionRow[]) {
  const activeRows = activeCollectionRows(rows);
  if (!activeRows.length) return 'أضف تحصيلًا واحدًا على الأقل.';

  const invalidRow = activeRows.find(
    (row) =>
      (row.destinationType === 'drawer' && !row.drawerId) ||
      (row.destinationType === 'vault' && !row.vaultId) ||
      (row.destinationType === 'bank' && !row.bankAccountId),
  );

  return invalidRow ? 'اختر جهة مستلمة واحدة لكل تحصيل.' : null;
}

export function toBackendCollection(row: CollectionRow) {
  return {
    paymentMethod: row.destinationType === 'drawer' ? 'cash' : row.destinationType,
    drawerId: row.destinationType === 'drawer' ? row.drawerId : null,
    vaultId: row.destinationType === 'vault' ? row.vaultId : null,
    bankAccountId: row.destinationType === 'bank' ? row.bankAccountId : null,
    amount: collectionRowAmount(row),
    paymentDate: row.collectionDate,
    referenceNumber: row.referenceNumber.trim() || null,
    notes: row.notes.trim() || null,
  };
}

export function CollectionDestinationRows({
  rows,
  onChange,
  drawers,
  vaults,
  bankAccounts,
  totalAmount,
  currencySymbol = '',
  decimalPlaces = 2,
  showRemaining = false,
  allowSettleRemaining = false,
  title = 'تحصيلات الفاتورة',
  description = 'اختر الجهة المستلمة لكل تحصيل: درج أو خزنة أو حساب بنكي.',
}: Readonly<{
  rows: CollectionRow[];
  onChange: (rows: CollectionRow[]) => void;
  drawers: DrawerOption[];
  vaults: VaultOption[];
  bankAccounts: BankAccountOption[];
  totalAmount?: number;
  currencySymbol?: string;
  decimalPlaces?: number;
  showRemaining?: boolean;
  allowSettleRemaining?: boolean;
  title?: string;
  description?: string;
}>) {
  const collectedTotal = collectionRowsTotal(rows);
  const remainingAmount = Math.max(Number(totalAmount ?? 0) - collectedTotal, 0);

  function formatMoney(value: number) {
    return `${new Intl.NumberFormat('ar', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value)} ${currencySymbol}`.trim();
  }

  function updateRow(index: number, patch: Partial<CollectionRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow(amount = '') {
    onChange([createCollectionRow(rows[0]?.collectionDate, amount), ...rows]);
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
            <button className="secondary-button" type="button" onClick={() => remainingAmount > 0 && addRow(String(remainingAmount))}>
              تحصيل المتبقي
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={() => addRow()}>
            إضافة تحصيل جديد
          </button>
        </div>
      </div>

      <div className="summary-grid compact-summary">
        <article className="summary-card">
          <p>إجمالي المحصل</p>
          <strong>{formatMoney(collectedTotal)}</strong>
        </article>
        {showRemaining ? (
          <article className="summary-card">
            <p>المتبقي للتحصيل</p>
            <strong>{formatMoney(remainingAmount)}</strong>
          </article>
        ) : null}
      </div>

      <div className="transfer-items-list">
        {rows.map((row, index) => (
          <article className="transfer-item-card" key={index}>
            <div className="transfer-item-grid">
              <label>
                نوع التحصيل
                <select
                  value={row.destinationType}
                  onChange={(event) =>
                    updateRow(index, {
                      destinationType: event.target.value as CollectionDestinationType,
                      drawerId: '',
                      vaultId: '',
                      bankAccountId: '',
                    })
                  }
                >
                  <option value="drawer">تحصيل إلى الدرج</option>
                  <option value="vault">تحصيل إلى الخزنة</option>
                  <option value="bank">تحصيل بنكي</option>
                </select>
              </label>
              <label>
                تاريخ التحصيل
                <input type="date" value={row.collectionDate} onChange={(event) => updateRow(index, { collectionDate: event.target.value })} />
              </label>
              <label>
                المبلغ
                <input type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateRow(index, { amount: event.target.value })} />
              </label>
              <label>
                الدرج
                <select value={row.drawerId} disabled={row.destinationType !== 'drawer'} onChange={(event) => updateRow(index, { drawerId: event.target.value })}>
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
                <select value={row.vaultId} disabled={row.destinationType !== 'vault'} onChange={(event) => updateRow(index, { vaultId: event.target.value })}>
                  <option value="">اختر الخزنة</option>
                  {vaults.map((vault) => (
                    <option key={vault.id} value={vault.id}>
                      {vault.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                الحساب البنكي
                <select value={row.bankAccountId} disabled={row.destinationType !== 'bank'} onChange={(event) => updateRow(index, { bankAccountId: event.target.value })}>
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
                <input maxLength={120} value={row.referenceNumber} onChange={(event) => updateRow(index, { referenceNumber: event.target.value })} />
              </label>
            </div>
            <label>
              ملاحظات التحصيل
              <textarea rows={2} value={row.notes} onChange={(event) => updateRow(index, { notes: event.target.value })} />
            </label>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChange(rows.length === 1 ? rows : rows.filter((_, rowIndex) => rowIndex !== index))}
            >
              حذف التحصيل
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
