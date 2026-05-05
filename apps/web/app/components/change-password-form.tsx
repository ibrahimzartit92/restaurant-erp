'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { writeAccessTokenToDocument } from '../lib/auth';
import { submitJson } from '../lib/client-api';

export function ChangePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage('تأكيد كلمة المرور غير مطابق.');
      return;
    }

    setIsSaving(true);

    try {
      const data = await submitJson<{ accessToken: string }>('/auth/change-password', 'POST', {
        currentPassword: String(formData.get('currentPassword') ?? ''),
        newPassword,
      });
      writeAccessTokenToDocument(data.accessToken);
      router.replace('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <label>
        كلمة المرور الحالية
        <input name="currentPassword" type="password" required />
      </label>
      <label>
        كلمة المرور الجديدة
        <input name="newPassword" type="password" minLength={8} required />
      </label>
      <label>
        تأكيد كلمة المرور الجديدة
        <input name="confirmPassword" type="password" minLength={8} required />
      </label>
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'جار الحفظ...' : 'تغيير كلمة المرور'}
      </button>
      <span className="login-hint">يجب تغيير كلمة المرور الافتراضية قبل استخدام لوحة الإدارة.</span>
    </form>
  );
}
