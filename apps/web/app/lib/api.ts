import { getAuthHeaders } from './server-auth';
import { getServerApiBaseUrls } from './api-url';

export type ApiListResult<T> = {
  data: T[];
  error?: string;
};

export async function fetchList<T>(path: string): Promise<ApiListResult<T>> {
  const headers = await getAuthHeaders();
  let authorizationError: ApiListResult<T> | null = null;

  for (const apiBaseUrl of getServerApiBaseUrls()) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        cache: 'no-store',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authorizationError = {
            data: [],
            error: 'غير مصرح لك بعرض هذه البيانات.',
          };
        }

        continue;
      }

      return { data: (await response.json()) as T[] };
    } catch {
      continue;
    }
  }

  return (
    authorizationError ?? {
      data: [],
      error: 'الخادم غير متاح حالياً. ستظهر البيانات هنا عند تشغيل الواجهة الخلفية.',
    }
  );
}

export async function fetchOne<T>(path: string): Promise<{ data: T | null; error?: string }> {
  const headers = await getAuthHeaders();
  let authorizationError: { data: T | null; error?: string } | null = null;

  for (const apiBaseUrl of getServerApiBaseUrls()) {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        cache: 'no-store',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authorizationError = {
            data: null,
            error: 'غير مصرح لك بعرض هذا السجل.',
          };
        }

        continue;
      }

      return { data: (await response.json()) as T };
    } catch {
      continue;
    }
  }

  return (
    authorizationError ?? {
      data: null,
      error: 'الخادم غير متاح حالياً.',
    }
  );
}

export function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : '';
}

export function formatMoney(value?: number | string | null) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'غير محدد';
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
