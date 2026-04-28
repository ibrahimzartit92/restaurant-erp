const localDevelopmentApiBaseUrl = 'http://localhost:3001';
const dockerInternalApiBaseUrl = 'http://api:3001';
const browserProxyApiBaseUrl = '/api';

function trimTrailingPathSlashes(value: string) {
  return value.length > 1 ? value.replace(/\/+$/, '') : value;
}

function normalizeAbsoluteUrl(value: string, envName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid http(s) URL or a same-origin path like /api.`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error(`${envName} must be a valid http(s) URL.`);
  }

  url.pathname = trimTrailingPathSlashes(url.pathname);
  url.search = '';
  url.hash = '';

  return trimTrailingPathSlashes(url.toString());
}

function stripTrailingApiPath(value: string) {
  return value.endsWith('/api') ? value.slice(0, -4) : value;
}

export function normalizeServerApiBaseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === '/api') {
    return null;
  }

  if (trimmedValue.startsWith('/')) {
    return null;
  }

  return stripTrailingApiPath(normalizeAbsoluteUrl(trimmedValue, 'API base URL'));
}

export function normalizeClientApiBaseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith('/')) {
    return trimTrailingPathSlashes(trimmedValue);
  }

  return normalizeAbsoluteUrl(trimmedValue, 'NEXT_PUBLIC_API_URL');
}

export function getClientApiBaseUrl() {
  const publicApiBaseUrl = normalizeClientApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  if (publicApiBaseUrl) {
    return publicApiBaseUrl;
  }

  return browserProxyApiBaseUrl;
}

export function buildClientApiUrl(path: string) {
  const clientApiBaseUrl = getClientApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (clientApiBaseUrl.startsWith('/')) {
    return `${trimTrailingPathSlashes(clientApiBaseUrl)}${normalizedPath}`;
  }

  return new URL(normalizedPath.slice(1), `${clientApiBaseUrl}/`).toString();
}

export function buildServerApiUrl(apiBaseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeServerApiBaseUrl(apiBaseUrl);

  if (!normalizedBaseUrl) {
    throw new Error('Backend API base URL must be an absolute http(s) URL.');
  }

  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return new URL(normalizedPath, `${normalizedBaseUrl}/`).toString();
}

export function getServerApiBaseUrls() {
  const internalApiBaseUrl = normalizeServerApiBaseUrl(process.env.INTERNAL_API_URL);

  if (internalApiBaseUrl) {
    return [internalApiBaseUrl];
  }

  const publicApiBaseUrl = normalizeServerApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  if (publicApiBaseUrl) {
    return [publicApiBaseUrl];
  }

  if (process.env.NODE_ENV === 'production') {
    return [dockerInternalApiBaseUrl];
  }

  return [localDevelopmentApiBaseUrl];
}

export function getServerApiBaseUrl() {
  return getServerApiBaseUrls()[0];
}

export function getInternalApiBaseUrls() {
  const configuredBaseUrl = normalizeServerApiBaseUrl(process.env.INTERNAL_API_URL);

  if (configuredBaseUrl) {
    return [configuredBaseUrl];
  }

  if (process.env.NODE_ENV === 'production') {
    return [dockerInternalApiBaseUrl];
  }

  return [localDevelopmentApiBaseUrl];
}
