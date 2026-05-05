'use client';

import { useRouter } from 'next/navigation';
import { clearAccessTokenFromDocument } from '../lib/auth';

export function LogoutButton() {
  const router = useRouter();

  function logout() {
    clearAccessTokenFromDocument();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button className="secondary-button" type="button" onClick={logout}>
      تسجيل الخروج
    </button>
  );
}
