'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BranchOption } from '../lib/types';

type DailySaleRecord = {
  id?: string;
  branchId?: string;
  salesDate?: string;
  cashSalesAmount?: number;
  bankSalesAmount?: number;
  deliverySalesAmount?: number;
  websiteSalesAmount?: number;
  tipsAmount?: number;
  salesReturnAmount?: number;
  notes?: string | null;
};

export function DailySaleForm({
  mode,
  initialDailySale,
  branches,
}: Readonly<{
  mode: 'create' | 'edit';
  initialDailySale?: DailySaleRecord | null;
  branches: BranchOption[];
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
      bankSalesAmount: Number(formData.get('bankSalesAmount') ?? 0),
      deliverySalesAmount: Number(formData.get('deliverySalesAmount') ?? 0),
      websiteSalesAmount: Number(formData.get('websiteSalesAmount') ?? 0),
      tipsAmount: Number(formData.get('tipsAmount') ?? 0),
      salesReturnAmount: Number(formData.get('salesReturnAmount') ?? 0),
      notes: String(formData.get('notes') ?? '') || null,
    };

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
          <input name="cashSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.cashSalesAmount ?? 0} required />
        </label>
        <label>
          مبيعات بنكية
          <input name="bankSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.bankSalesAmount ?? 0} required />
        </label>
        <label>
          مبيعات التوصيل
          <input name="deliverySalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.deliverySalesAmount ?? 0} required />
        </label>
        <label>
          مبيعات الموقع
          <input name="websiteSalesAmount" type="number" min="0" step="0.01" defaultValue={initialDailySale?.websiteSalesAmount ?? 0} required />
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
