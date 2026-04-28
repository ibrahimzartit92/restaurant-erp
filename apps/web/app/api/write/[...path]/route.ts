import { NextRequest } from 'next/server';
import { sessionCookieName } from '../../../lib/auth';
import { getServerApiBaseUrls } from '../../../lib/api-url';

const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  const cookieToken = request.cookies.get(sessionCookieName)?.value;

  for (const header of hopByHopHeaders) {
    headers.delete(header);
  }

  if (!headers.has('authorization') && cookieToken) {
    headers.set('authorization', `Bearer ${cookieToken}`);
  }

  return headers;
}

async function writeProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join('/')}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();

  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    return Response.json({ message: 'طريقة الطلب غير مدعومة لمسار الكتابة.' }, { status: 405 });
  }

  const body = await request.arrayBuffer();

  for (const apiBaseUrl of getServerApiBaseUrls()) {
    try {
      const upstreamResponse = await fetch(`${apiBaseUrl}${upstreamPath}`, {
        method,
        headers: buildForwardHeaders(request),
        body,
        cache: 'no-store',
        redirect: 'manual',
      });
      const responseHeaders = new Headers(upstreamResponse.headers);

      for (const header of hopByHopHeaders) {
        responseHeaders.delete(header);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch {
      continue;
    }
  }

  return Response.json({ message: 'تعذر الاتصال بالخادم الخلفي لحفظ البيانات.' }, { status: 502 });
}

export const POST = writeProxy;
export const PATCH = writeProxy;
export const PUT = writeProxy;
export const DELETE = writeProxy;
