'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { UnitOption } from '../lib/types';

type UnitDetails = UnitOption & {
  notes?: string | null;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

export function UnitForm({ initialUnit }: Readonly<{ initialUnit?: UnitDetails | null }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await submitJson(initialUnit?.id ? `/units/${initialUnit.id}` : '/units', initialUnit?.id ? 'PATCH' : 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        isActive: formData.get('isActive') === 'on',
        notes: optionalText(formData, 'notes'),
      });
      router.push('/units');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الوحدة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          كود الوحدة
          <input name="code" maxLength={50} required defaultValue={initialUnit?.code ?? ''} placeholder="KG" />
        </label>
        <label>
          اسم الوحدة
          <input name="name" maxLength={120} required defaultValue={initialUnit?.name ?? ''} placeholder="كيلوغرام" />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked={initialUnit?.isActive ?? true} />
          الوحدة نشطة
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} defaultValue={initialUnit?.notes ?? ''} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : initialUnit?.id ? 'حفظ التعديلات' : 'حفظ الوحدة'}
        </button>
      </div>
    </form>
  );
}
