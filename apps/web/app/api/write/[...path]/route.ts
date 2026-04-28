import { NextRequest } from 'next/server';
import { proxyWriteRequest } from '../proxy';

async function writeProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join('/')}${request.nextUrl.search}`;

  return proxyWriteRequest(request, upstreamPath);
}

export const POST = writeProxy;
export const PATCH = writeProxy;
export const PUT = writeProxy;
export const DELETE = writeProxy;
