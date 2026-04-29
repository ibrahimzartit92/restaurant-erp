import { NextRequest } from 'next/server';
import { buildServerApiUrl, getServerApiBaseUrls } from '../../lib/api-url';
import { sessionCookieName } from '../../lib/auth';

const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

async function proxyRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join('/')}${request.nextUrl.search}`;
  const requestHeaders = new Headers(request.headers);
  const cookieToken = request.cookies.get(sessionCookieName)?.value;
  let apiBaseUrls: string[];

  for (const header of hopByHopHeaders) {
    requestHeaders.delete(header);
  }

  if (!requestHeaders.has('authorization') && cookieToken) {
    requestHeaders.set('authorization', `Bearer ${cookieToken}`);
  }

  try {
    apiBaseUrls = getServerApiBaseUrls();
  } catch (error) {
    return Response.json(
      {
        message: 'إعداد رابط الخادم الخلفي غير صحيح.',
        detail: error instanceof Error ? error.message : 'Invalid backend API URL.',
      },
      { status: 500 },
    );
  }

  for (const apiBaseUrl of apiBaseUrls) {
    let upstreamUrl: string;

    try {
      upstreamUrl = buildServerApiUrl(apiBaseUrl, upstreamPath);
    } catch (error) {
      return Response.json(
        {
          message: 'تعذر تكوين رابط الخادم الخلفي.',
          detail: error instanceof Error ? error.message : 'Invalid backend API URL.',
        },
        { status: 500 },
      );
    }

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: requestHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
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

  return Response.json({ message: 'تعذر الاتصال بالخادم الخلفي.' }, { status: 502 });
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
