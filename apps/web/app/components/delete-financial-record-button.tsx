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

  async function handleClick() {
    const confirmation = reverse
      ? 'سيتم حذف السجل وتسجيل حركة عكسية لإرجاع الأثر المالي. هل تريد المتابعة؟'
      : 'سيتم حذف السجل وحركاته المالية الأصلية. هل تريد المتابعة؟';

    if (!confirm(confirmation)) return;

    setIsDeleting(true);
    try {
      await submitJson(`${path}?reverse_financial_effect=${reverse}`, 'DELETE', {});
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button className="secondary-button" disabled={isDeleting} onClick={handleClick} type="button">
      {isDeleting ? 'جاري الحذف...' : label}
    </button>
  );
}
