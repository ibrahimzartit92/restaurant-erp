'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { CustomerOption } from '../lib/types';

export function CustomerForm({ initialCustomer = null }: Readonly<{ initialCustomer?: CustomerOption | null }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson(initialCustomer?.id ? `/customers/${initialCustomer.id}` : '/customers', initialCustomer?.id ? 'PATCH' : 'POST', {
        name: String(formData.get('name') ?? '').trim(),
        phone: String(formData.get('phone') ?? '').trim() || null,
        address: String(formData.get('address') ?? '').trim() || null,
        isActive: formData.get('isActive') === 'on',
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      router.push('/customers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ العميل.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          اسم العميل
          <input defaultValue={initialCustomer?.name ?? ''} maxLength={180} name="name" required />
        </label>
        <label>
          الهاتف
          <input defaultValue={initialCustomer?.phone ?? ''} maxLength={40} name="phone" />
        </label>
        <label className="checkbox-field">
          <input defaultChecked={initialCustomer?.isActive ?? true} name="isActive" type="checkbox" />
          العميل نشط
        </label>
      </div>
      <label>
        العنوان
        <textarea defaultValue={initialCustomer?.address ?? ''} name="address" rows={3} />
      </label>
      <label>
        ملاحظات
        <textarea defaultValue={initialCustomer?.notes ?? ''} name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : 'حفظ العميل'}
        </button>
      </div>
    </form>
  );
}
