import type { Metadata } from 'next';
import Link from 'next/link';
import { AppHeader } from '@/components/aeroopt/app-header';
import { ROUTES, durationText, routeSlug } from '@/lib/routes';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const title = 'Popular flight routes across India and beyond';
const description = 'Browse popular domestic and international flight routes from India and compare each by total journey value on AeroOpt — the meta-search that ranks the best overall trip, not just the cheapest fare.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/flights` },
  openGraph: { title, description, url: `${SITE_URL}/flights`, siteName: SITE_NAME, type: 'website' },
};

export default function FlightsIndexPage() {
  const domestic = ROUTES.filter((route) => route.domestic);
  const international = ROUTES.filter((route) => !route.domestic);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: ROUTES.map((route, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${route.origin.city} to ${route.destination.city}`,
      url: `${SITE_URL}/flights/${routeSlug(route)}`,
    })),
  };

  const renderGroup = (heading: string, routes: typeof ROUTES) => (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">{heading}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <Link
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
            href={`/flights/${routeSlug(route)}`}
            key={routeSlug(route)}
          >
            <p className="font-semibold text-slate-950">{route.origin.city} → {route.destination.city}</p>
            <p className="mt-1 text-sm text-slate-500">{route.origin.code}–{route.destination.code} · about {durationText(route.typicalDurationMinutes)}</p>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-[#07162b] text-white">
        <div className="mx-auto max-w-5xl px-5 py-12 lg:py-16">
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Popular flight routes</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Pick a route to compare fares by whole-journey value — then book with the airline or a partner. AeroOpt never adds a
            booking fee.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-5 pb-16">
        {renderGroup('Domestic routes', domestic)}
        {renderGroup('International routes', international)}
      </div>
    </main>
  );
}
