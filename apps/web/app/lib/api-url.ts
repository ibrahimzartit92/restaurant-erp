const localDevelopmentApiBaseUrl = 'http://localhost:3001';
const dockerInternalApiBaseUrl = 'http://api:3001';
const browserProxyApiBaseUrl = '/api';

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

function stripTrailingApiPath(value: string) {
  return value.endsWith('/api') ? value.slice(0, -4) : value;
}

export function normalizeServerApiBaseUrl(value?: string | null) {
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

  return stripTrailingApiPath(trimmedValue);
}

export function normalizeClientApiBaseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = trimTrailingSlashes(value.trim());

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith('/')) {
    return trimmedValue;
  }

  return normalizeServerApiBaseUrl(trimmedValue);
}

export function getClientApiBaseUrl() {
  const publicApiBaseUrl = normalizeClientApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  if (publicApiBaseUrl?.startsWith('/')) {
    return publicApiBaseUrl;
  }

  return browserProxyApiBaseUrl;
}

export function getServerApiBaseUrls() {
  const configuredBaseUrls = [
    normalizeServerApiBaseUrl(process.env.INTERNAL_API_URL),
    normalizeServerApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  ].filter((url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index);

  if (configuredBaseUrls.length > 0) {
    return configuredBaseUrls;
  }

  if (process.env.NODE_ENV === 'production') {
    return [dockerInternalApiBaseUrl];
  }

  return [localDevelopmentApiBaseUrl];
}

export function getServerApiBaseUrl() {
  return getServerApiBaseUrls()[0];
}
