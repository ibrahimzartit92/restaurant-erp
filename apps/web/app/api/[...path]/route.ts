import { NextRequest } from 'next/server';
import { getServerApiBaseUrls } from '../../lib/api-url';

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

  for (const header of hopByHopHeaders) {
    requestHeaders.delete(header);
  }

  for (const apiBaseUrl of getServerApiBaseUrls()) {
    try {
      const upstreamResponse = await fetch(`${apiBaseUrl}${upstreamPath}`, {
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
