import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock3, Plane, ShieldCheck } from 'lucide-react';
import { AppHeader } from '@/components/aeroopt/app-header';
import { Button } from '@/components/ui/button';
import { ROUTES, allRouteSlugs, durationText, getRoute, routeFaqs, routeSlug } from '@/lib/routes';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return allRouteSlugs().map((route) => ({ route }));
}

export async function generateMetadata({ params }: { params: Promise<{ route: string }> }): Promise<Metadata> {
  const { route: slug } = await params;
  const route = getRoute(slug);
  if (!route) return {};
  const title = `Flights from ${route.origin.city} to ${route.destination.city} (${route.origin.code}–${route.destination.code})`;
  const description = `Compare ${route.origin.city} to ${route.destination.city} flights by total journey value — price, duration, baggage, reliability and connection risk. Typical flight time ${durationText(route.typicalDurationMinutes)} with ${route.airlines.join(', ')}.`;
  const url = `${SITE_URL}/flights/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function RouteLandingPage({ params }: { params: Promise<{ route: string }> }) {
  const { route: slug } = await params;
  const route = getRoute(slug);
  if (!route) notFound();
  const { origin, destination } = route;
  const faqs = routeFaqs(route);
  const related = ROUTES.filter(
    (candidate) =>
      routeSlug(candidate) !== slug &&
      (candidate.origin.code === origin.code || candidate.destination.code === destination.code),
  ).slice(0, 6);
  const searchHref = `/?from=${origin.code}&to=${destination.code}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Flights', item: `${SITE_URL}/flights` },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${origin.city} to ${destination.city}`,
            item: `${SITE_URL}/flights/${slug}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  };

  const facts = [
    { label: 'Route', value: `${origin.code} → ${destination.code}` },
    { label: 'Typical flight time', value: durationText(route.typicalDurationMinutes) },
    { label: 'Best routing', value: route.nonstop ? 'Nonstop available' : 'Usually 1 stop' },
    { label: 'Trip type', value: route.domestic ? 'Domestic (India)' : 'International' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-[#07162b] text-white">
        <div className="mx-auto max-w-4xl px-5 py-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-400">
            <Link className="hover:text-white" href="/">Home</Link>
            <span className="px-2">/</span>
            <Link className="hover:text-white" href="/flights">Flights</Link>
            <span className="px-2">/</span>
            <span className="text-slate-200">{origin.city} to {destination.city}</span>
          </nav>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Flights from {origin.city} to {destination.city}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Compare {origin.city} ({origin.code}) to {destination.city} ({destination.code}) flights by whole-journey value —
            price, duration, baggage, reliability and connection risk — then book with the airline or a partner. AeroOpt is a
            meta-search engine and never adds a booking fee.
          </p>
          <Button className="mt-7 h-12 bg-cyan-300 px-6 text-[#061226] hover:bg-cyan-200" render={<Link href={searchHref} />}>
            Search {origin.code} → {destination.code} flights
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-5" key={fact.label}>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{fact.label}</dt>
              <dd className="mt-2 text-lg font-semibold text-slate-950">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Plane className="size-5 text-blue-600" /> Airlines on this route</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              {route.airlines.map((airline) => (
                <li className="flex items-center gap-2" key={airline}><ShieldCheck className="size-4 text-emerald-500" /> {airline}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-500">
              From {origin.airport} to {destination.airport}.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Clock3 className="size-5 text-blue-600" /> Why book smarter</h2>
            <p className="mt-4 leading-7 text-slate-700">
              The cheapest {origin.city}–{destination.city} fare is rarely the best trip. AeroOpt scores every offer 0–100 on the
              factors that actually shape your day — long layovers, tight connections, checked-bag rules and schedule fit — so you
              can see why one option beats another before you pay.
            </p>
          </article>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.035em]">Frequently asked questions</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <details className="rounded-2xl border border-slate-200 bg-white p-5" key={faq.question}>
                <summary className="cursor-pointer font-semibold text-slate-900">{faq.question}</summary>
                <p className="mt-3 leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-[-0.035em]">Related routes</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {related.map((candidate) => (
                <Link
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  href={`/flights/${routeSlug(candidate)}`}
                  key={routeSlug(candidate)}
                >
                  {candidate.origin.city} → {candidate.destination.city}
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
