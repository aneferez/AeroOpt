import type { NextRequest } from 'next/server';
import { demoAirports, demoSearch } from '../../../../lib/demo-backend';
import type { SearchRequest } from '../../../../types/travel';

export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const configuredBase = process.env.BACKEND_API_URL;
  const base = configuredBase ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:8000/api/v1' : null);
  if (!base) {
    // The hosted starter can run a safe, deterministic demo mode without a
    // separate API service. Live accounts, saved flights, and alerts still
    // require configuring BACKEND_API_URL.
    if (path.join('/') === 'flights/search' && request.method === 'POST') {
      try {
        const body = (await request.json()) as SearchRequest;
        return Response.json(demoSearch(body));
      } catch {
        return Response.json({ detail: 'The demo search request was invalid.' }, { status: 400 });
      }
    }
    if (path.join('/') === 'airports' && request.method === 'GET') {
      return Response.json(demoAirports(request.nextUrl.searchParams.get('query') ?? ''));
    }
    return Response.json(
      { detail: 'AeroOpt is running in demo mode. Configure BACKEND_API_URL for accounts, saved flights, alerts, and live fares.' },
      { status: 503 },
    );
  }
  const normalizedBase = base.replace(/\/$/, '');
  const url = new URL(`${normalizedBase}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
