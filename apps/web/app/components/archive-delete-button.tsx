'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function ArchiveDeleteButton({
  path,
  entityLabel,
}: Readonly<{
  path: string;
  entityLabel: string;
}>) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(`سيتم حذف ${entityLabel} إذا لم يكن مرتبطا بسجلات، أو أرشفته وتعطيله إذا كان له تاريخ سابق. هل تريد المتابعة؟`)) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const result = (await submitJson(path, 'DELETE', {})) as { deleted?: boolean; deactivated?: boolean; message?: string };
      setMessage(result.message ?? (result.deactivated ? `تم أرشفة ${entityLabel} وتعطيله.` : `تم حذف ${entityLabel}.`));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `تعذر حذف أو أرشفة ${entityLabel}.`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <span className="inline-action-stack">
      <button className="secondary-button danger" disabled={isSaving} onClick={handleClick} type="button">
        {isSaving ? 'جاري التنفيذ...' : 'حذف / أرشفة'}
      </button>
      {message ? <small className="field-hint">{message}</small> : null}
    </span>
  );
}
