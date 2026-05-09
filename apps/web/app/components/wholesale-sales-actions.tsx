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
      setMessage(error instanceof Error ? error.message : 'طھط¹ط°ط± طھظ†ظپظٹط° ط§ظ„ط¹ظ…ظ„ظٹط©.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <span className="inline-action-stack">
      <span className="inline-actions">
        {canApprove ? (
          <button className="secondary-button" disabled={isSaving} onClick={() => run(`/api/wholesale-sales-invoices/${invoiceId}/approve`, 'ط³ظٹطھظ… ط§ط¹طھظ…ط§ط¯ ط§ظ„ظپط§طھظˆط±ط© ظˆط®طµظ… ط§ظ„ظ…ط®ط²ظˆظ† ظ…ظ† ط§ظ„ظ…ط®ط²ظ† ط§ظ„ظ…ط­ط¯ط¯. ظ…طھط§ط¨ط¹ط©طں')} type="button">
            ط§ط¹طھظ…ط§ط¯ ط§ظ„ظپط§طھظˆط±ط©
          </button>
        ) : null}
        <button className="secondary-button danger" disabled={isSaving} onClick={() => run(`/api/wholesale-sales-invoices/${invoiceId}/cancel`, 'ط³ظٹطھظ… ط¥ظ„ط؛ط§ط، ط§ظ„ظپط§طھظˆط±ط© ظˆط¥ط²ط§ظ„ط© ط£ط«ط±ظ‡ط§ ط§ظ„ظ…ط®ط²ظ†ظٹ. ظ…طھط§ط¨ط¹ط©طں')} type="button">
          ط¥ظ„ط؛ط§ط، ط§ظ„ظپط§طھظˆط±ط©
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
      await submitJson(`/api/wholesale-sales-invoices/${invoiceId}/transfer-cash-to-vault`, 'POST', {
        drawerId: String(formData.get('drawerId') ?? ''),
        vaultId: String(formData.get('vaultId') ?? ''),
        amount: Number(formData.get('amount') ?? 0),
        transferDate: String(formData.get('transferDate') ?? ''),
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      setMessage('طھظ… طھط­ظˆظٹظ„ ط§ظ„طھط­طµظٹظ„ ط§ظ„ظ†ظ‚ط¯ظٹ ط¥ظ„ظ‰ ط§ظ„ط®ط²ظ†ط©.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'طھط¹ط°ط± طھط­ظˆظٹظ„ ط§ظ„طھط­طµظٹظ„ ط§ظ„ظ†ظ‚ط¯ظٹ.');
    } finally {
      setIsSaving(false);
    }
  }

  if (availableAmount <= 0) {
    return <p className="notice">ظ„ط§ ظٹظˆط¬ط¯ طھط­طµظٹظ„ ظ†ظ‚ط¯ظٹ ظپظٹ ط§ظ„ط¯ط±ط¬ ظ…طھط§ط­ ظ„ظ„طھط­ظˆظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط®ط²ظ†ط© ظ„ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©.</p>;
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('طھظ…') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-grid">
        <label>
          ط§ظ„ط¯ط±ط¬ ط§ظ„ظ…ط­طµظ„ ظ…ظ†ظ‡
          <select name="drawerId" required>
            <option value="">ط§ط®طھط± ط§ظ„ط¯ط±ط¬</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          ط§ظ„ط®ط²ظ†ط© ط§ظ„ظ…ط³طھظ„ظ…ط©
          <select name="vaultId" required>
            <option value="">ط§ط®طھط± ط§ظ„ط®ط²ظ†ط©</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          ط§ظ„ظ…ط¨ظ„ط؛
          <input defaultValue={availableAmount} max={availableAmount} min="0.01" name="amount" required step="0.01" type="number" />
        </label>
        <label>
          طھط§ط±ظٹط® ط§ظ„طھط­ظˆظٹظ„
          <input defaultValue={new Date().toISOString().slice(0, 10)} name="transferDate" required type="date" />
        </label>
      </div>
      <label>
        ظ…ظ„ط§ط­ط¸ط§طھ
        <textarea name="notes" rows={2} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'ط¬ط§ط± ط§ظ„طھط­ظˆظٹظ„...' : 'طھط­ظˆظٹظ„ ط§ظ„طھط­طµظٹظ„ ط¥ظ„ظ‰ ط§ظ„ط®ط²ظ†ط©'}
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPersistedInvoiceId) {
      setMessage('ظٹط¬ط¨ ط­ظپط¸ ط§ظ„ظپط§طھظˆط±ط© ط£ظˆظ„ظ‹ط§ ظ‚ط¨ظ„ طھط³ط¬ظٹظ„ ط§ظ„طھط­طµظٹظ„ط§طھ.');
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
      await submitJson(`/api/wholesale-sales-invoices/${invoiceId}/payments/batch`, 'POST', {
        invoiceId,
        branchId,
        paymentDate: activeRows[0]?.collectionDate ?? new Date().toISOString().slice(0, 10),
        payments: activeRows.map(toBackendCollection),
      });
      setRows([createCollectionRow()]);
      setMessage('طھظ… طھط³ط¬ظٹظ„ ط§ظ„طھط­طµظٹظ„ط§طھ.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'طھط¹ط°ط± طھط³ط¬ظٹظ„ ط§ظ„طھط­طµظٹظ„ط§طھ.');
    } finally {
      setIsSaving(false);
    }
  }

  if (remainingAmount <= 0) {
    return <p className="notice success">طھظ… طھط­طµظٹظ„ ط§ظ„ظپط§طھظˆط±ط© ط¨ط§ظ„ظƒط§ظ…ظ„.</p>;
  }

  if (!hasPersistedInvoiceId) {
    return <p className="notice warning">ظٹط¬ط¨ ط­ظپط¸ ط§ظ„ظپط§طھظˆط±ط© ط£ظˆظ„ظ‹ط§ ظ‚ط¨ظ„ طھط³ط¬ظٹظ„ ط§ظ„طھط­طµظٹظ„ط§طھ.</p>;
  }

  return (
    <form className="stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('طھظ…') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <CollectionDestinationRows
        rows={rows}
        onChange={setRows}
        drawers={drawers}
        vaults={vaults}
        bankAccounts={bankAccounts}
        title="ط¥ط¶ط§ظپط© طھط­طµظٹظ„ط§طھ"
        description="ط³ط¬ظ„ طھط­طµظٹظ„ظ‹ط§ ظˆط§ط±ط¯ظ‹ط§ ط¥ظ„ظ‰ ط§ظ„ط¯ط±ط¬ ط£ظˆ ط§ظ„ط®ط²ظ†ط© ط£ظˆ ط§ظ„ط­ط³ط§ط¨ ط§ظ„ط¨ظ†ظƒظٹ."
        totalAmount={remainingAmount}
        showRemaining
        allowSettleRemaining
      />
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'ط¬ط§ط± ط§ظ„طھط³ط¬ظٹظ„...' : 'طھط³ط¬ظٹظ„ ط§ظ„طھط­طµظٹظ„ط§طھ'}
        </button>
      </div>
    </form>
  );
}
