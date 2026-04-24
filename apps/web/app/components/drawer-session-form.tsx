'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { DrawerOption } from '../lib/types';

export function DrawerSessionForm({ drawers }: Readonly<{ drawers: DrawerOption[] }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const drawerId = String(formData.get('drawerId') ?? '');
    const drawer = drawers.find((item) => item.id === drawerId);

    try {
      await submitJson('/drawer-daily-sessions', 'POST', {
        drawerId,
        branchId: drawer?.branchId ?? '',
        sessionDate: String(formData.get('sessionDate') ?? ''),
        openingBalance: Number(formData.get('openingBalance') ?? 0),
        notes: String(formData.get('notes') ?? '') || null,
      });
      router.push('/drawer-daily-sessions');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر فتح الجلسة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          الدرج
          <select name="drawerId" required>
            <option value="">اختر الدرج</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name} - {drawer.branch?.name ?? 'بدون فرع'}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ الجلسة
          <input name="sessionDate" type="date" required />
        </label>
        <label>
          الرصيد الافتتاحي
          <input name="openingBalance" type="number" min="0" step="0.01" required />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'فتح الجلسة'}
        </button>
      </div>
    </form>
  );
}
