'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearAccessTokenFromDocument, writeAccessTokenToDocument } from '../lib/auth';

const clientApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      clearAccessTokenFromDocument();

      const response = await fetch(`${clientApiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(formData.get('login') ?? ''),
          password: String(formData.get('password') ?? ''),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? 'تعذر تسجيل الدخول.');
      }

      const data = (await response.json()) as { accessToken: string };
      writeAccessTokenToDocument(data.accessToken);
      router.push('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <label>
        اسم المستخدم أو البريد الإلكتروني
        <input name="login" type="text" placeholder="admin أو admin@example.com" required />
      </label>
      <label>
        كلمة المرور
        <input name="password" type="password" placeholder="••••••••" required />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'جار تسجيل الدخول...' : 'دخول'}
      </button>
      <LinkHint />
    </form>
  );
}

function LinkHint() {
  return <span className="login-hint">بعد تسجيل الدخول ستظهر الصفحات المحمية حسب الصلاحيات الممنوحة للحساب.</span>;
}
