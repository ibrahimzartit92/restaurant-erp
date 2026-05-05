'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAccessTokenFromDocument } from '../lib/auth';

const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export function SessionTimeoutGuard({ timeoutMinutes }: Readonly<{ timeoutMinutes: number }>) {
  const router = useRouter();
  const timeoutMs = Math.max(timeoutMinutes, 1) * 60 * 1000;
  const warningMs = Math.min(60_000, Math.floor(timeoutMs / 3));
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    function markActivity() {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    }

    function logout() {
      clearAccessTokenFromDocument();
      router.replace('/login?reason=timeout');
      router.refresh();
    }

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;

      if (idleMs >= timeoutMs) {
        logout();
        return;
      }

      setShowWarning(idleMs >= timeoutMs - warningMs);
    }, 5000);

    return () => {
      window.clearInterval(interval);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActivity);
      }
    };
  }, [router, timeoutMs, warningMs]);

  if (!showWarning) {
    return null;
  }

  return (
    <div className="session-warning" role="status">
      <span>ستنتهي الجلسة قريبا بسبب عدم النشاط.</span>
      <button
        type="button"
        onClick={() => {
          lastActivityRef.current = Date.now();
          setShowWarning(false);
        }}
      >
        متابعة العمل
      </button>
    </div>
  );
}
