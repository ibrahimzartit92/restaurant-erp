'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function DeleteUnitButton({ unitId }: Readonly<{ unitId: string }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteUnit() {
    if (!window.confirm('هل تريد حذف هذه الوحدة؟ لا يمكن حذف الوحدة إذا كانت مستخدمة في مواد محفوظة.')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      await submitJson(`/units/${unitId}/delete`, 'POST', {});
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف الوحدة.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <span>
      <button className="link-button danger" disabled={isDeleting} onClick={deleteUnit} type="button">
        {isDeleting ? 'جار الحذف...' : 'حذف'}
      </button>
      {message ? <small className="danger-text">{message}</small> : null}
    </span>
  );
}
