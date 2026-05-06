'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DrawerOption, VaultOption } from '../lib/types';

type DailySaleRecord = {
  id?: string;
  branchId?: string;
  salesDate?: string;
  cashSalesAmount?: number;
  drawerId?: string | null;
  bankSalesAmount?: number;
  bankAccountId?: string | null;
  deliverySalesAmount?: number;
  websiteSalesAmount?: number;
  tipsAmount?: number;
  salesReturnAmount?: number;
  notes?: string | null;
  vaultTransferVaultId?: string | null;
  vaultTransferAmount?: number;
  vaultTransferNotes?: string | null;
};

export function DailySaleForm({
  mode,
  initialDailySale,
  branches,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  mode: 'create' | 'edit';
  initialDailySale?: DailySaleRecord | null;
  branches: BranchOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
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
    const payload = {
      branchId: String(formData.get('branchId') ?? ''),
      salesDate: String(formData.get('salesDate') ?? ''),
      cashSalesAmount: Number(formData.get('cashSalesAmount') ?? 0),
      drawerId: String(formData.get('drawerId') ?? '') || null,
      bankSalesAmount: Number(formData.get('bankSalesAmount') ?? 0),
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      deliverySalesAmount: Number(formData.get('deliverySalesAmount') ?? 0),
      websiteSalesAmount: Number(formData.get('websiteSalesAmount') ?? 0),
      tipsAmount: Number(formData.get('tipsAmount') ?? 0),
      salesReturnAmount: Number(formData.get('salesReturnAmount') ?? 0),
      notes: String(formData.get('notes') ?? '') || null,
      vaultTransferVaultId: String(formData.get('vaultTransferVaultId') ?? '') || null,
      vaultTransferAmount: Number(formData.get('vaultTransferAmount') ?? 0),
      vaultTransferNotes: String(formData.get('vaultTransferNotes') ?? '') || null,
    };

    if (payload.vaultTransferAmount > 0 && payload.vaultTransferAmount > payload.cashSalesAmount) {
      setMessage('لا يمكن تحويل مبلغ إلى الخزنة أكبر من المبيعات النقدية المسجلة لهذا اليوم.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(
        mode === 'create' ? '/daily-sales' : `/daily-sales/${initialDailySale?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/daily-sales');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المبيعات اليومية.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          الفرع
          <select name="branchId" defaultValue={initialDailySale?.branchId ?? ''} required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          التاريخ
          <input name="salesDate" type="date" defaultValue={initialDailySale?.salesDate ?? ''} required />
        </label>
        <label>
          مبيعات نقدية
          <input name="cashSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.cashSalesAmount ?? 0} />
        </label>
        <label>
          الدرج النقدي
          <select name="drawerId" defaultValue={initialDailySale?.drawerId ?? ''}>
            <option value="">اختر الدرج عند وجود مبيعات نقدية</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          مبيعات بنكية
          <input name="bankSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.bankSalesAmount ?? 0} />
        </label>
        <label>
          الحساب البنكي
          <select name="bankAccountId" defaultValue={initialDailySale?.bankAccountId ?? ''}>
            <option value="">اختر الحساب عند وجود مبيعات بنكية</option>
            {bankAccounts.map((bankAccount) => (
              <option key={bankAccount.id} value={bankAccount.id}>
                {bankAccount.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          مبيعات التوصيل
          <input name="deliverySalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.deliverySalesAmount ?? 0} />
        </label>
        <label>
          مبيعات الموقع
          <input name="websiteSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.websiteSalesAmount ?? 0} />
        </label>
        <label>
          الإكراميات
          <input name="tipsAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.tipsAmount ?? 0} />
        </label>
        <label>
          مرتجعات المبيعات
          <input name="salesReturnAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.salesReturnAmount ?? 0} />
        </label>
      </div>

      <section className="panel subtle-panel">
        <div className="panel-heading">
          <div>
            <h3>تحويل نقد المبيعات إلى الخزنة</h3>
            <span>اختياري: عند إدخال مبلغ هنا سيتم تسجيل خروج من الدرج ودخول مرتبط إلى الخزنة.</span>
          </div>
        </div>
        <div className="form-grid">
          <label>
            الخزنة
            <select name="vaultTransferVaultId" defaultValue={initialDailySale?.vaultTransferVaultId ?? ''}>
              <option value="">بدون تحويل</option>
              {vaults.map((vault) => (
                <option key={vault.id} value={vault.id}>
                  {vault.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المبلغ المحول إلى الخزنة
            <input name="vaultTransferAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.vaultTransferAmount ?? 0} />
          </label>
          <label>
            ملاحظات التحويل
            <input name="vaultTransferNotes" defaultValue={initialDailySale?.vaultTransferNotes ?? ''} placeholder="اختياري" />
          </label>
        </div>
      </section>

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialDailySale?.notes ?? ''} rows={4} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'حفظ المبيعات اليومية'}
        </button>
      </div>
    </form>
  );
}
