import { type NextRequest, NextResponse } from 'next/server';
import {
  demoAirports,
  demoAlerts,
  demoDashboard,
  demoInterpret,
  demoPreferences,
  type DemoPreferences,
  demoSaveFlight,
  demoSavedFlights,
  demoSearch,
  demoToken,
  demoUser,
} from '../../../../lib/demo-backend';
import type { SavedFlight, SearchRequest, UserSummary } from '../../../../types/travel';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'aeroopt_demo_session';
const PREFERENCES_COOKIE = 'aeroopt_demo_preferences';

function encodeCookie(value: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(value)));
}

function decodeCookie<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as T;
  } catch {
    return null;
  }
}

function readSession(request: NextRequest): UserSummary | null {
  return decodeCookie<UserSummary>(request.cookies.get(SESSION_COOKIE)?.value);
}

function setSessionCookie(response: NextResponse, user: UserSummary): void {
  response.cookies.set(SESSION_COOKIE, encodeCookie(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

function unauthorized(): NextResponse {
  return NextResponse.json({ detail: 'Sign in to your demo account to view this.' }, { status: 401 });
}

async function readJson<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

// Deterministic, credential-free responses for the hosted starter. Only the
// flight search and airport lookup work signed-out; a demo account (tracked by
// an httpOnly cookie) unlocks the assistant, dashboard, saved flights, alerts,
// and preferences so the whole product can be explored without a backend.
async function handleDemo(request: NextRequest, route: string): Promise<Response> {
  const method = request.method;

  if (route === 'flights/search' && method === 'POST') {
    const body = await readJson<SearchRequest>(request);
    if (!body) return NextResponse.json({ detail: 'The demo search request was invalid.' }, { status: 400 });
    return NextResponse.json(demoSearch(body));
  }

  if (route === 'airports' && method === 'GET') {
    return NextResponse.json(demoAirports(request.nextUrl.searchParams.get('query') ?? ''));
  }

  if (route === 'assistant/interpret' && method === 'POST') {
    const body = await readJson<{ query?: string }>(request);
    const query = body?.query ?? '';
    if (query.trim().length < 5) {
      return NextResponse.json({ detail: 'Describe the trip in a few more words.' }, { status: 400 });
    }
    return NextResponse.json(demoInterpret(query));
  }

  if (route === 'auth/register' && method === 'POST') {
    const body = await readJson<{ email?: string; display_name?: string }>(request);
    if (!body?.email) return NextResponse.json({ detail: 'An email is required.' }, { status: 400 });
    const user = demoUser(body.email, body.display_name);
    const response = NextResponse.json(demoToken(user));
    setSessionCookie(response, user);
    return response;
  }

  if (route === 'auth/login' && method === 'POST') {
    const body = await readJson<{ email?: string }>(request);
    if (!body?.email) return NextResponse.json({ detail: 'An email is required.' }, { status: 400 });
    const user = demoUser(body.email);
    const response = NextResponse.json(demoToken(user));
    setSessionCookie(response, user);
    return response;
  }

  if (route === 'auth/refresh' && method === 'POST') {
    const user = readSession(request);
    if (!user) return unauthorized();
    return NextResponse.json(demoToken(user));
  }

  if (route === 'auth/logout' && method === 'POST') {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  }

  // Everything below requires an active demo session.
  const user = readSession(request);
  if (!user) return unauthorized();

  if (route === 'users/dashboard' && method === 'GET') {
    return NextResponse.json(demoDashboard());
  }

  if (route === 'users/preferences' && method === 'GET') {
    const stored = decodeCookie<Partial<DemoPreferences>>(request.cookies.get(PREFERENCES_COOKIE)?.value) ?? {};
    return NextResponse.json(demoPreferences(user.id, stored));
  }

  if (route === 'users/preferences' && method === 'PUT') {
    const body = (await readJson<Partial<DemoPreferences>>(request)) ?? {};
    const merged = demoPreferences(user.id, { ...body, updated_at: new Date().toISOString() });
    const persist: Partial<DemoPreferences> = {
      profile: merged.profile,
      weights: merged.weights,
      preferred_departure_period: merged.preferred_departure_period,
      max_stops: merged.max_stops,
      checked_bag_required: merged.checked_bag_required,
      value_of_time: merged.value_of_time,
      preferred_airports: merged.preferred_airports,
      updated_at: merged.updated_at,
    };
    const response = NextResponse.json(merged);
    response.cookies.set(PREFERENCES_COOKIE, encodeCookie(persist), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  if (route === 'saved-flights' && method === 'GET') {
    return NextResponse.json(demoSavedFlights());
  }

  if (route === 'saved-flights' && method === 'POST') {
    const body = (await readJson<Partial<SavedFlight>>(request)) ?? {};
    return NextResponse.json(demoSaveFlight(user.id, body), { status: 201 });
  }

  if (route === 'alerts' && method === 'GET') {
    return NextResponse.json(demoAlerts(user.email));
  }

  if (route === 'trips' && method === 'GET') {
    return NextResponse.json([]);
  }

  return NextResponse.json(
    { detail: 'This action is not available in demo mode. Configure BACKEND_API_URL for the full API.' },
    { status: 503 },
  );
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join('/');
  const configuredBase = process.env.BACKEND_API_URL;
  const base = configuredBase ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:8000/api/v1' : null);
  if (!base) {
    return handleDemo(request, route);
  }
  const normalizedBase = base.replace(/\/$/, '');
  const url = new URL(`${normalizedBase}/${route}`);
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
