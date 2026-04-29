'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DrawerOption } from '../lib/types';

type TransferKind =
  | 'deposit_from_drawer'
  | 'deposit_from_bank'
  | 'manual_deposit'
  | 'withdrawal_to_bank'
  | 'payroll_payment'
  | 'admin_withdrawal'
  | 'manual_withdrawal'
  | 'settlement';

const transferLabels: Record<TransferKind, string> = {
  deposit_from_drawer: 'تحويل من درج إلى الخزنة',
  deposit_from_bank: 'إيداع من البنك إلى الخزنة',
  manual_deposit: 'إيداع يدوي',
  withdrawal_to_bank: 'تحويل من الخزنة إلى البنك',
  payroll_payment: 'دفع رواتب',
  admin_withdrawal: 'سحب إداري',
  manual_withdrawal: 'سحب يدوي',
  settlement: 'تسوية',
};

export function VaultTransferForm({
  vaultId,
  drawers,
  bankAccounts,
  branches,
  defaultKind = 'manual_deposit',
  compact = false,
}: Readonly<{
  vaultId: string;
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  branches?: BranchOption[];
  defaultKind?: TransferKind;
  compact?: boolean;
}>) {
  const router = useRouter();
  const [transferKind, setTransferKind] = useState<TransferKind>(defaultKind);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const needsDrawer = transferKind === 'deposit_from_drawer';
  const needsBank = transferKind === 'deposit_from_bank' || transferKind === 'withdrawal_to_bank';

  const helperText = useMemo(() => {
    if (transferKind === 'deposit_from_drawer') return 'سيتم تسجيل خروج من الدرج ودخول إلى الخزنة.';
    if (transferKind === 'deposit_from_bank') return 'سيتم تسجيل خروج من الحساب البنكي ودخول إلى الخزنة.';
    if (transferKind === 'withdrawal_to_bank') return 'سيتم تسجيل خروج من الخزنة ودخول إلى الحساب البنكي.';
    return 'سيتم تسجيل حركة خزنة مباشرة بدون تعديل رصيد درج أو بنك.';
  }, [transferKind]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get('amount') ?? 0);
    const drawerId = String(formData.get('drawerId') ?? '') || null;
    const bankAccountId = String(formData.get('bankAccountId') ?? '') || null;

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('أدخل مبلغا صحيحا أكبر من صفر.');
      setIsSaving(false);
      return;
    }

    if (needsDrawer && !drawerId) {
      setMessage('اختر الدرج المراد التحويل منه.');
      setIsSaving(false);
      return;
    }

    if (needsBank && !bankAccountId) {
      setMessage('اختر الحساب البنكي المرتبط بالحركة.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(`/vaults/${vaultId}/transactions`, 'POST', {
        transferKind,
        transactionDate: String(formData.get('transactionDate') ?? ''),
        amount,
        branchId: String(formData.get('branchId') ?? '') || null,
        drawerId: needsDrawer ? drawerId : null,
        bankAccountId: needsBank ? bankAccountId : null,
        referenceNumber: String(formData.get('referenceNumber') ?? '').trim() || null,
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      event.currentTarget.reset();
      setTransferKind(defaultKind);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ حركة الخزنة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={compact ? 'form-panel compact-form' : 'form-panel'} onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="panel-heading">
        <div>
          <h3>حركة خزنة</h3>
          <span>{helperText}</span>
        </div>
      </div>
      <div className="form-grid">
        <label>
          نوع الحركة
          <select value={transferKind} onChange={(event) => setTransferKind(event.target.value as TransferKind)}>
            {Object.entries(transferLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
          الفرع
          <select name="branchId">
            <option value="">بدون فرع</option>
            {(branches ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الدرج
          <select name="drawerId" disabled={!needsDrawer}>
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
          <select name="bankAccountId" disabled={!needsBank}>
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
          <input name="referenceNumber" maxLength={120} placeholder="اختياري" />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : 'حفظ الحركة'}
        </button>
      </div>
    </form>
  );
}
