'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function UndoActionButton({ actionId }: Readonly<{ actionId: string }>) {
  const router = useRouter();
  const [isUndoing, setIsUndoing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUndo() {
    if (!confirm('سيتم التراجع عن العملية واستعادة السجل قدر الإمكان. هل تريد المتابعة؟')) {
      return;
    }

    setIsUndoing(true);
    setMessage(null);
    try {
      await submitJson(`/undo-actions/${actionId}/undo`, 'POST', {});
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر التراجع عن العملية.');
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <span className="inline-action-stack">
      <button className="secondary-button" disabled={isUndoing} onClick={handleUndo} type="button">
        {isUndoing ? 'جاري التراجع...' : 'تراجع'}
      </button>
      {message ? <small className="field-hint danger">{message}</small> : null}
    </span>
  );
}
