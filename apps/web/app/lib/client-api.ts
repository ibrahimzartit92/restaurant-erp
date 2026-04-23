'use client';

const clientApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function submitJson(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const response = await fetch(`${clientApiBaseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? 'تعذر حفظ البيانات.');
  }

  return response.json();
}
