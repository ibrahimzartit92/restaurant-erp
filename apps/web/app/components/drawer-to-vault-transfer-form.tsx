'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { DrawerOption, VaultOption } from '../lib/types';

export function DrawerToVaultTransferForm({
  drawers,
  vaults,
}: Readonly<{
  drawers: DrawerOption[];
  vaults: VaultOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const vaultId = String(formData.get('vaultId') ?? '');
    const drawerId = String(formData.get('drawerId') ?? '');
    const drawer = drawers.find((item) => item.id === drawerId);
    const amount = Number(formData.get('amount') ?? 0);

    if (!vaultId || !drawerId) {
      setMessage('اختر الخزنة والدرج قبل الحفظ.');
      setIsSaving(false);
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('أدخل مبلغا صحيحا للتحويل.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(`/vaults/${vaultId}/transactions`, 'POST', {
        transferKind: 'deposit_from_drawer',
        transactionDate: String(formData.get('transactionDate') ?? ''),
        amount,
        drawerId,
        branchId: drawer?.branchId ?? null,
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحويل المبلغ إلى الخزنة.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!drawers.length || !vaults.length) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>تحويل إلى الخزنة</h3>
          <span>يسجل النظام خروج نقد من الدرج ودخول نفس المبلغ إلى الخزنة.</span>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        {message ? <p className="notice danger">{message}</p> : null}
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
          الدرج
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
          التاريخ
          <input name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          المبلغ
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          ملاحظات
          <input name="notes" placeholder="اختياري" />
        </label>
        <div className="form-actions">
          <button disabled={isSaving} type="submit">
            {isSaving ? 'جاري التحويل...' : 'تحويل إلى الخزنة'}
          </button>
        </div>
      </form>
    </section>
  );
}
