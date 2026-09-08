import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const configuredBase = process.env.BACKEND_API_URL;
  const base = configuredBase ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:8000/api/v1' : null);
  if (!base) {
    return Response.json(
      { detail: 'AeroOpt API is not configured for this deployment yet.' },
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
