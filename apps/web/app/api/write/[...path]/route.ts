import { NextRequest } from 'next/server';
import { sessionCookieName } from '../../../lib/auth';
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

type WriteContext = {
  params: Promise<{ path: string[] }>;
};

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  const cookieToken = request.cookies.get(sessionCookieName)?.value;

  for (const header of hopByHopHeaders) {
    headers.delete(header);
  }

  headers.delete('x-write-method');

  if (!headers.has('authorization') && cookieToken) {
    headers.set('authorization', `Bearer ${cookieToken}`);
  }

  return headers;
}

async function proxyWriteRequest(request: NextRequest, context: WriteContext) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join('/')}${request.nextUrl.search}`;
  const browserMethod = request.method.toUpperCase();
  const writeMethod = request.headers.get('x-write-method')?.toUpperCase() ?? browserMethod;

  if (browserMethod !== 'POST') {
    return Response.json({ message: 'يجب إرسال طلبات الحفظ من المتصفح بطريقة POST.' }, { status: 405 });
  }

  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(writeMethod)) {
    return Response.json({ message: 'طريقة الطلب غير مدعومة لمسار الكتابة.' }, { status: 405 });
  }

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
    let upstreamUrl: string;

    try {
      upstreamUrl = buildServerApiUrl(apiBaseUrl, upstreamPath);
    } catch (error) {
      return Response.json(
        {
          message: 'تعذر تكوين رابط الخادم الخلفي للحفظ.',
          detail: error instanceof Error ? error.message : 'Invalid backend API URL.',
        },
        { status: 500 },
      );
    }

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: writeMethod,
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

export async function POST(request: NextRequest, context: WriteContext) {
  return proxyWriteRequest(request, context);
}

export async function PATCH(request: NextRequest, context: WriteContext) {
  return proxyWriteRequest(request, context);
}

export async function PUT(request: NextRequest, context: WriteContext) {
  return proxyWriteRequest(request, context);
}

export async function DELETE(request: NextRequest, context: WriteContext) {
  return proxyWriteRequest(request, context);
}
