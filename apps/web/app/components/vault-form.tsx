'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BranchOption } from '../lib/types';

type VaultFormRecord = {
  id: string;
  code: string;
  name: string;
  branchId?: string | null;
  openingBalance?: number | string | null;
  openingBalanceDate?: string | null;
  isActive?: boolean;
  notes?: string | null;
};

export function VaultForm({
  mode,
  initialVault,
  branches = [],
}: Readonly<{
  mode: 'create' | 'edit';
  initialVault?: VaultFormRecord | null;
  branches?: BranchOption[];
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
      const payload = {
        code: String(formData.get('code') ?? '').trim(),
        name: String(formData.get('name') ?? '').trim(),
        branchId: String(formData.get('branchId') ?? '') || null,
        openingBalance: Number(formData.get('openingBalance') ?? 0),
        openingBalanceDate: String(formData.get('openingBalanceDate') ?? '') || null,
        isActive: formData.get('isActive') === 'on',
        notes: String(formData.get('notes') ?? '').trim() || null,
      };

      if (!payload.code || !payload.name) {
        setMessage('الكود واسم الخزنة مطلوبان.');
        return;
      }

      const path = mode === 'edit' && initialVault ? `/vaults/${initialVault.id}` : '/vaults';
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      await submitJson(path, method, payload);
      router.push('/vaults');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الخزنة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          كود الخزنة
          <input name="code" defaultValue={initialVault?.code ?? ''} maxLength={50} required />
        </label>
        <label>
          اسم الخزنة
          <input name="name" defaultValue={initialVault?.name ?? ''} maxLength={160} required />
        </label>
        <label>
          الفرع المرتبط
          <select name="branchId" defaultValue={initialVault?.branchId ?? ''}>
            <option value="">بدون ربط بفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الرصيد الافتتاحي
          <input
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={String(initialVault?.openingBalance ?? 0)}
          />
        </label>
        <label>
          تاريخ الرصيد الافتتاحي
          <input name="openingBalanceDate" type="date" defaultValue={initialVault?.openingBalanceDate ?? ''} />
        </label>
        <label className="checkbox-row">
          <input name="isActive" type="checkbox" defaultChecked={initialVault?.isActive ?? true} />
          الخزنة نشطة
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} defaultValue={initialVault?.notes ?? ''} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : 'حفظ الخزنة'}
        </button>
      </div>
    </form>
  );
}
