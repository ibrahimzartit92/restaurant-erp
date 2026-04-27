const defaultApiBaseUrl = 'http://localhost:3001';

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

export function normalizeApiBaseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = trimTrailingSlashes(value.trim());

  if (!trimmedValue || trimmedValue === '/api') {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.pathname === '/api') {
      url.pathname = '';
      return trimTrailingSlashes(url.toString());
    }
  } catch {
    // Relative API base URLs are not useful here because the backend is a separate service.
  }

  return trimmedValue.endsWith('/api') ? trimmedValue.slice(0, -4) : trimmedValue;
}

export function getClientApiBaseUrl() {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL) ?? defaultApiBaseUrl;
}

export function getServerApiBaseUrls() {
  return [
    normalizeApiBaseUrl(process.env.INTERNAL_API_URL),
    normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
    defaultApiBaseUrl,
  ].filter((url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index);
}

export function getServerApiBaseUrl() {
  return getServerApiBaseUrls()[0] ?? defaultApiBaseUrl;
}
