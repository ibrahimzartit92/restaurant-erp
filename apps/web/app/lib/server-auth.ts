import { cookies } from 'next/headers';
import { sessionCookieName } from './auth';
import type { UserSummary } from './types';

const apiBaseUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value ?? null;
}

export async function getAuthHeaders() {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function getCurrentUser() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UserSummary;
  } catch {
    return null;
  }
}
