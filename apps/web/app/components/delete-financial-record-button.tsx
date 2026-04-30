'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function DeleteFinancialRecordButton({
  path,
  reverse,
  label,
}: Readonly<{
  path: string;
  reverse: boolean;
  label: string;
}>) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    const confirmation = reverse
      ? 'سيتم حذف السجل وتسجيل حركة واردة في الخزنة بقيمة الأثر المالي. هل تريد المتابعة؟'
      : 'سيتم حذف السجل فقط وإزالة حركاته المالية الأصلية بدون إرجاع المبلغ إلى الخزنة. هل تريد المتابعة؟';

    if (!confirm(confirmation)) return;

    setIsDeleting(true);
    setMessage(null);
    try {
      await submitJson(`${path}?reverse_financial_effect=${reverse}`, 'DELETE', {});
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف السجل.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <span className="inline-action-stack">
      <button className="secondary-button" disabled={isDeleting} onClick={handleClick} type="button">
        {isDeleting ? 'جاري الحذف...' : label}
      </button>
      {message ? <small className="field-hint danger">{message}</small> : null}
    </span>
  );
}
