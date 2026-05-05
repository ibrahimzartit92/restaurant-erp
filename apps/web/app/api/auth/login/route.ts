import { NextRequest } from 'next/server';
import { buildServerApiUrl, getInternalApiBaseUrls } from '../../../lib/api-url';

const hopByHopHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

export async function POST(request: NextRequest) {
  const body = await request.arrayBuffer();
  let apiBaseUrls: string[];

  try {
    apiBaseUrls = getInternalApiBaseUrls();
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
    try {
      const upstreamResponse = await fetch(buildServerApiUrl(apiBaseUrl, '/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('content-type') ?? 'application/json',
        },
        body,
        cache: 'no-store',
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

  return Response.json({ message: 'تعذر الاتصال بالخادم الخلفي لتسجيل الدخول.' }, { status: 502 });
}
