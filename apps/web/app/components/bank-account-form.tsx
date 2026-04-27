'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountSummary } from '../lib/types';

export function BankAccountForm({
  mode,
  initialAccount,
}: Readonly<{
  mode: 'create' | 'edit';
  initialAccount?: BankAccountSummary | null;
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
      code: String(formData.get('code') ?? ''),
      name: String(formData.get('name') ?? ''),
      bankName: String(formData.get('bankName') ?? ''),
      iban: String(formData.get('iban') ?? '') || null,
      accountNumber: String(formData.get('accountNumber') ?? '') || null,
      currency: String(formData.get('currency') ?? ''),
      isActive: formData.get('isActive') === 'on',
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        mode === 'create' ? '/bank-accounts' : `/bank-accounts/${initialAccount?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/bank-accounts');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الحساب البنكي.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          كود الحساب
          <input defaultValue={initialAccount?.code ?? ''} maxLength={50} name="code" required />
        </label>
        <label>
          اسم الحساب
          <input defaultValue={initialAccount?.name ?? ''} maxLength={160} name="name" required />
        </label>
        <label>
          اسم البنك
          <input defaultValue={initialAccount?.bankName ?? ''} maxLength={160} name="bankName" required />
        </label>
        <label>
          العملة
          <input defaultValue={initialAccount?.currency ?? 'SAR'} maxLength={10} name="currency" required />
        </label>
        <label>
          رقم الآيبان
          <input defaultValue={initialAccount?.iban ?? ''} maxLength={34} name="iban" />
        </label>
        <label>
          رقم الحساب
          <input defaultValue={initialAccount?.accountNumber ?? ''} maxLength={60} name="accountNumber" />
        </label>
        <label className="checkbox-field">
          <input defaultChecked={initialAccount?.isActive ?? true} name="isActive" type="checkbox" />
          الحساب نشط
        </label>
      </div>

      <label>
        ملاحظات
        <textarea defaultValue={initialAccount?.notes ?? ''} name="notes" rows={4} />
      </label>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : mode === 'create' ? 'حفظ الحساب البنكي' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
