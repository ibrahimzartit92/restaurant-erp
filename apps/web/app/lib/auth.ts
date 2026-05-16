export const sessionCookieName = 'restaurant_erp_access_token';
export const tabSessionStorageKey = 'restaurant_erp_tab_session_active';
export const accessTokenStorageKey = 'restaurant_erp_access_token';

function readSessionStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
}

function removeSessionStorage(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
}

export function readAccessTokenFromDocument() {
  if (typeof window === 'undefined') {
    return null;
  }

  return readSessionStorage(accessTokenStorageKey);
}

export function writeAccessTokenToDocument(accessToken: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  writeSessionStorage(accessTokenStorageKey, accessToken);
  writeSessionStorage(tabSessionStorageKey, '1');
  document.cookie = `${sessionCookieName}=${encodeURIComponent(accessToken)}; path=/; samesite=lax`;
}

export function clearAccessTokenFromDocument() {
  if (typeof document === 'undefined') {
    return;
  }

  if (typeof window !== 'undefined') {
    removeSessionStorage(accessTokenStorageKey);
    removeSessionStorage(tabSessionStorageKey);
  }
  document.cookie = `${sessionCookieName}=; path=/; max-age=0; samesite=lax`;
}

export function hasActiveTabAuthSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  return readSessionStorage(tabSessionStorageKey) === '1' && Boolean(readSessionStorage(accessTokenStorageKey));
}
