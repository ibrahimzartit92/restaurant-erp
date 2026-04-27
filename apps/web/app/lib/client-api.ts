'use client';

import { readAccessTokenFromDocument } from './auth';

const clientApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function submitJson(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const accessToken = readAccessTokenFromDocument();
  const response = await fetch(`${clientApiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'تعذر حفظ البيانات.');
  }

  return response.json();
}

export async function submitFormData(path: string, formData: FormData) {
  const accessToken = readAccessTokenFromDocument();
  const response = await fetch(`${clientApiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'تعذر رفع الملف.');
  }

  return response.json();
}
