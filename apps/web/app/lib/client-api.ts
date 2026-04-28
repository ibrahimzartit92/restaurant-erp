'use client';

import { readAccessTokenFromDocument } from './auth';

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function joinUrl(path: string) {
  return `/api/write${path.startsWith('/') ? path : `/${path}`}`;
}

function formatBackendMessage(body: ApiErrorBody | string | null, fallbackMessage: string) {
  if (!body) {
    return fallbackMessage;
  }

  if (typeof body === 'string') {
    return body.trim() || fallbackMessage;
  }

  if (Array.isArray(body.message)) {
    return body.message.join('، ');
  }

  return body.message ?? body.error ?? fallbackMessage;
}

async function readErrorBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json().catch(() => null)) as ApiErrorBody | null;
  }

  return response.text().catch(() => null);
}

export async function throwIfApiError(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return;
  }

  const body = await readErrorBody(response);
  const backendMessage = formatBackendMessage(body, fallbackMessage);
  const statusLabel = response.statusText ? `${response.status} ${response.statusText}` : String(response.status);

  throw new ApiRequestError(`${backendMessage} (${statusLabel})`, response.status, response.statusText);
}

async function readSuccessJson(response: Response) {
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function submitJson(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
  const accessToken = readAccessTokenFromDocument();
  const response = await fetch(joinUrl(path), {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  await throwIfApiError(response, 'تعذر حفظ البيانات.');

  return readSuccessJson(response);
}

export async function submitFormData(path: string, formData: FormData) {
  const accessToken = readAccessTokenFromDocument();
  const response = await fetch(joinUrl(path), {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  await throwIfApiError(response, 'تعذر رفع الملف.');

  return readSuccessJson(response);
}
