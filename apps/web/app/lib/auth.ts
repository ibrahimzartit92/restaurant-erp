export const sessionCookieName = 'restaurant_erp_access_token';

export function readAccessTokenFromDocument() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePart = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${sessionCookieName}=`));

  return cookiePart ? decodeURIComponent(cookiePart.split('=').slice(1).join('=')) : null;
}

export function writeAccessTokenToDocument(accessToken: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${sessionCookieName}=${encodeURIComponent(accessToken)}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export function clearAccessTokenFromDocument() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${sessionCookieName}=; path=/; max-age=0; samesite=lax`;
}
