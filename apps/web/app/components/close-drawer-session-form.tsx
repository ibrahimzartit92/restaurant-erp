'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function CloseDrawerSessionForm({ sessionId }: Readonly<{ sessionId: string }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await submitJson(`/drawer-daily-sessions/${sessionId}/close`, 'POST', {
        closingBalance: Number(formData.get('closingBalance') ?? 0),
        notes: String(formData.get('notes') ?? '') || null,
      });
      router.push(`/drawer-daily-sessions/${sessionId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إغلاق الجلسة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <label>
        الرصيد الختامي
        <input name="closingBalance" type="number" min="0" step="0.01" required />
      </label>
      <label>
        ملاحظات الإغلاق
        <textarea name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الإغلاق...' : 'إغلاق الجلسة'}
        </button>
      </div>
    </form>
  );
}
