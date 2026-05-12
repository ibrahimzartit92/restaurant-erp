'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function DailySalesClosingDeleteButton({ closingId }: Readonly<{ closingId: string }>) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this draft closing and its autosaved wizard data?')) return;
    setIsSaving(true);
    try {
      await submitJson(`/daily-sales/closings/${closingId}`, 'DELETE', {});
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button className="text-link danger-text" disabled={isSaving} onClick={handleDelete} type="button">
      {isSaving ? 'Deleting...' : 'Delete draft'}
    </button>
  );
}
