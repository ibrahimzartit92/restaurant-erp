'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
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

type CashSummary = {
  drawerId: string | null;
  drawerName?: string;
  cashOutflowsFromDrawer: number;
};

function money(value: number) {
  return new Intl.NumberFormat('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

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
  const [branchId, setBranchId] = useState(initialDailySale?.branchId ?? '');
  const [salesDate, setSalesDate] = useState(initialDailySale?.salesDate ?? '');
  const [drawerId, setDrawerId] = useState(initialDailySale?.drawerId ?? '');
  const [cashSalesAmount, setCashSalesAmount] = useState(String(initialDailySale?.cashSalesAmount ?? 0));
  const [actualCashReceived, setActualCashReceived] = useState(String(initialDailySale?.vaultTransferAmount ?? 0));
  const [cashSummary, setCashSummary] = useState<CashSummary>({
    drawerId: initialDailySale?.drawerId ?? null,
    cashOutflowsFromDrawer: 0,
  });
  const cashSales = Number(cashSalesAmount || 0);
  const receivedCash = Number(actualCashReceived || 0);
  const netExpectedCash = useMemo(
    () => Math.round((cashSales - Number(cashSummary.cashOutflowsFromDrawer ?? 0) + Number.EPSILON) * 100) / 100,
    [cashSales, cashSummary.cashOutflowsFromDrawer],
  );
  const cashDifference = Math.round((receivedCash - netExpectedCash + Number.EPSILON) * 100) / 100;

  useEffect(() => {
    if (!branchId || !salesDate) return;
    let isActive = true;
    const params = new URLSearchParams({ branch_id: branchId, sales_date: salesDate });
    fetchClientJson<CashSummary>(`/daily-sales/cash-summary?${params.toString()}`)
      .then((summary) => {
        if (!isActive) return;
        setCashSummary(summary);
        if (summary.drawerId) setDrawerId(summary.drawerId);
      })
      .catch(() => {
        if (isActive) setCashSummary({ drawerId: null, cashOutflowsFromDrawer: 0 });
      });

    return () => {
      isActive = false;
    };
  }, [branchId, salesDate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      branchId,
      salesDate,
      cashSalesAmount: cashSales,
      drawerId: drawerId || null,
      bankSalesAmount: Number(formData.get('bankSalesAmount') ?? 0),
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      deliverySalesAmount: Number(formData.get('deliverySalesAmount') ?? 0),
      websiteSalesAmount: Number(formData.get('websiteSalesAmount') ?? 0),
      tipsAmount: Number(formData.get('tipsAmount') ?? 0),
      salesReturnAmount: Number(formData.get('salesReturnAmount') ?? 0),
      notes: String(formData.get('notes') ?? '') || null,
      vaultTransferVaultId: String(formData.get('vaultTransferVaultId') ?? '') || null,
      vaultTransferAmount: receivedCash,
      vaultTransferNotes: String(formData.get('vaultTransferNotes') ?? '') || null,
    };

    if (receivedCash > 0 && !payload.vaultTransferVaultId) {
      setMessage('اختر الخزنة التي سيتم تحويل النقد المستلم إليها.');
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
          <select name="branchId" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
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
          <input name="salesDate" type="date" value={salesDate} onChange={(event) => setSalesDate(event.target.value)} required />
        </label>
        <label>
          مبيعات نقدية
          <input name="cashSalesAmount" type="number" min="0" step="0.01" value={cashSalesAmount} onChange={(event) => setCashSalesAmount(event.target.value)} />
        </label>
        <label>
          الدرج النقدي
          <select name="drawerId" value={drawerId} onChange={(event) => setDrawerId(event.target.value)}>
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
            <h3>تسليم نقد المبيعات إلى الخزنة</h3>
            <span>أدخل المبلغ المستلم فعليًا من المحاسب، وسيتم تحويل نفس المبلغ تلقائيًا إلى الخزنة.</span>
          </div>
        </div>
        <section className="summary-grid drawer-cash-summary">
          <article className="summary-card">
            <p>المبيعات النقدية</p>
            <strong>{money(cashSales)}</strong>
          </article>
          <article className="summary-card">
            <p>المصاريف النقدية من الدرج</p>
            <strong>{money(cashSummary.cashOutflowsFromDrawer)}</strong>
          </article>
          <article className="summary-card">
            <p>الصافي النقدي المتوقع</p>
            <strong>{money(netExpectedCash)}</strong>
          </article>
          <article className={cashDifference < 0 ? 'summary-card danger' : cashDifference > 0 ? 'summary-card success' : 'summary-card'}>
            <p>الفرق</p>
            <strong>{money(cashDifference)}</strong>
            <span>{cashDifference < 0 ? 'عجز' : cashDifference > 0 ? 'زيادة' : 'مطابق'}</span>
          </article>
        </section>
        <div className="form-grid">
          <label>
            المبلغ المستلم من المحاسب
            <input type="number" min="0" step="0.01" value={actualCashReceived} onChange={(event) => setActualCashReceived(event.target.value)} />
          </label>
          <label>
            المبلغ المحول إلى الخزنة
            <input disabled value={money(receivedCash)} />
          </label>
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
