'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BranchOption } from '../lib/types';

type DrawerFormValue = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  defaultOpeningBalance?: number;
  defaultCashFloat?: number;
  isActive: boolean;
  notes?: string | null;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(formData.get(key) ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function DrawerForm({
  branches,
  initialDrawer,
}: Readonly<{
  branches: BranchOption[];
  initialDrawer?: DrawerFormValue;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mode = initialDrawer ? 'edit' : 'create';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const defaultOpeningBalance = numberValue(formData, 'defaultOpeningBalance');

    try {
      await submitJson(mode === 'create' ? '/drawers' : `/drawers/${initialDrawer?.id}`, mode === 'create' ? 'POST' : 'PATCH', {
        branchId: text(formData, 'branchId'),
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        defaultOpeningBalance,
        defaultCashFloat: numberValue(formData, 'defaultCashFloat', defaultOpeningBalance),
        isActive: formData.get('isActive') === 'on',
        notes: optionalText(formData, 'notes'),
      });
      router.push('/drawers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الدرج.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialDrawer || !confirm('سيتم حذف الدرج إن لم تكن له حركات، أو إيقافه إذا كان مرتبطا بسجلات مالية. هل تريد المتابعة؟')) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const result = (await submitJson(`/drawers/${initialDrawer.id}`, 'DELETE', {})) as { deactivated?: boolean } | null;
      if (result?.deactivated) {
        setMessage('الدرج مرتبط بسجلات مالية، لذلك تم إيقافه بدلا من حذفه.');
        router.refresh();
        return;
      }
      router.push('/drawers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف الدرج.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className={message.includes('تم ') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-grid">
        <label>
          الفرع
          <select name="branchId" defaultValue={initialDrawer?.branchId ?? ''} required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          كود الدرج
          <input name="code" maxLength={50} defaultValue={initialDrawer?.code ?? ''} required />
        </label>
        <label>
          اسم الدرج
          <input name="name" maxLength={160} defaultValue={initialDrawer?.name ?? ''} required />
        </label>
        <label>
          العهدة الافتتاحية الافتراضية
          <input name="defaultOpeningBalance" type="number" min="0" step="0.01" defaultValue={initialDrawer?.defaultOpeningBalance ?? 0} />
        </label>
        <label>
          العهدة الثابتة اليومية
          <input
            name="defaultCashFloat"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialDrawer?.defaultCashFloat ?? initialDrawer?.defaultOpeningBalance ?? 0}
          />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked={initialDrawer?.isActive ?? true} />
          الدرج نشط
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} defaultValue={initialDrawer?.notes ?? ''} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : 'حفظ الدرج'}
        </button>
        {initialDrawer ? (
          <button className="secondary-button" disabled={isSaving} onClick={handleDelete} type="button">
            حذف الدرج
          </button>
        ) : null}
      </div>
    </form>
  );
}
