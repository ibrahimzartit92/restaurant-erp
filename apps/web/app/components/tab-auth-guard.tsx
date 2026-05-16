'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAccessTokenFromDocument, hasActiveTabAuthSession } from '../lib/auth';

export function TabAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    if (hasActiveTabAuthSession()) {
      return;
    }

    clearAccessTokenFromDocument();
    router.replace('/login');
    router.refresh();
  }, [router]);

  return null;
}
