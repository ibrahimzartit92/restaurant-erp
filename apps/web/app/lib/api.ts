import { getAuthHeaders } from './server-auth';
import { getServerApiBaseUrls } from './api-url';
import { formatMoneyWithCurrency } from './money';

export { formatMoneyWithCurrency };

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
      error: 'الخادم غير متاح حاليا. ستظهر البيانات هنا عند تشغيل الواجهة الخلفية.',
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
      error: 'الخادم غير متاح حاليا.',
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
  return formatMoneyWithCurrency(value);
}

type SettingsResponse = {
  groups: {
    key: string;
    fields: {
      key: string;
      value: string | number | boolean | null;
      defaultValue?: string | number | boolean | null;
    }[];
  }[];
};

export async function getCurrencySettings() {
  const result = await fetchOne<SettingsResponse>('/settings');
  const financeGroup = result.data?.groups.find((group) => group.key === 'finance');
  const currencySymbolField = financeGroup?.fields.find((field) => field.key === 'currencySymbol');
  const decimalPlacesField = financeGroup?.fields.find((field) => field.key === 'decimalPlaces');
  const currencySymbol = String(currencySymbolField?.value ?? currencySymbolField?.defaultValue ?? 'ر.س').trim() || 'ر.س';
  const decimalPlaces = Number(decimalPlacesField?.value ?? decimalPlacesField?.defaultValue ?? 2);

  return {
    currencySymbol,
    decimalPlaces: Number.isFinite(decimalPlaces) ? decimalPlaces : 2,
  };
}

export async function getMoneyFormatter() {
  const { currencySymbol, decimalPlaces } = await getCurrencySettings();

  return (value?: number | string | null) => formatMoneyWithCurrency(value, currencySymbol, decimalPlaces);
}

export async function getInactivityTimeoutMinutes() {
  const result = await fetchOne<SettingsResponse>('/settings');
  const accessGroup = result.data?.groups.find((group) => group.key === 'access');
  const timeoutField = accessGroup?.fields.find((field) => field.key === 'inactivityTimeoutMinutes');
  const timeoutMinutes = Number(timeoutField?.value ?? timeoutField?.defaultValue ?? 30);

  return Number.isFinite(timeoutMinutes) && timeoutMinutes >= 1 ? timeoutMinutes : 30;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'غير محدد';
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
