'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { RoleSummary } from '../lib/types';

export function RoleForm({
  mode,
  initialRole,
}: Readonly<{
  mode: 'create' | 'edit';
  initialRole?: RoleSummary | null;
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
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        mode === 'create' ? '/roles' : `/roles/${initialRole?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/roles');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الدور.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          كود الدور
          <input name="code" defaultValue={initialRole?.code ?? ''} maxLength={80} required />
        </label>
        <label>
          اسم الدور
          <input name="name" defaultValue={initialRole?.name ?? ''} maxLength={120} required />
        </label>
      </div>

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialRole?.notes ?? ''} rows={4} maxLength={2000} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : mode === 'create' ? 'حفظ الدور' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
