const apiBaseUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiListResult<T> = {
  data: T[];
  error?: string;
};

export async function fetchList<T>(path: string): Promise<ApiListResult<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        data: [],
        error: 'تعذر تحميل البيانات من الخادم.',
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
