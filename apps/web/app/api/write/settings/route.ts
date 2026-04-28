import { NextRequest } from 'next/server';
import { proxyWriteRequest } from '../proxy';

function settingsProxy(request: NextRequest) {
  return proxyWriteRequest(request, `/settings${request.nextUrl.search}`);
}

export const PATCH = settingsProxy;
