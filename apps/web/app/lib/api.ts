import { getAuthHeaders } from './server-auth';

const apiBaseUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiListResult<T> = {
  data: T[];
  error?: string;
};

export async function fetchList<T>(path: string): Promise<ApiListResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: 'no-store',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      return {
        data: [],
        error: response.status === 401 || response.status === 403 ? 'غير مصرح لك بعرض هذه البيانات.' : 'تعذر تحميل البيانات من الخادم.',
      };
    }

    const data = (await response.json()) as T[];

    return { data };
  } catch {
    return {
      data: [],
      error: 'الخادم غير متاح حالياً. ستظهر البيانات هنا عند تشغيل الواجهة الخلفية.',
    };
  }
}

export async function fetchOne<T>(path: string): Promise<{ data: T | null; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: 'no-store',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      return {
        data: null,
        error: response.status === 401 || response.status === 403 ? 'غير مصرح لك بعرض هذا السجل.' : 'تعذر تحميل السجل المطلوب.',
      };
    }

    return { data: (await response.json()) as T };
  } catch {
    return {
      data: null,
      error: 'الخادم غير متاح حالياً.',
    };
  }
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
