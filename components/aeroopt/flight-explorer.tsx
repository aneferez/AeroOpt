'use client';

import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Filter, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { apiFetch } from '@/lib/api';
import { useSearchStore } from '@/store/search-store';
import type { SearchRequest, SearchResponse } from '@/types/travel';
import { ComparisonSheet } from './comparison-sheet';
import { FlightCard } from './flight-card';
import { FlightSearchPanel } from './flight-search-panel';
import { RecommendationStrip } from './recommendation-strip';
import { SearchSkeleton } from './search-skeleton';

type SortMode = 'score' | 'price' | 'duration' | 'risk';

export function FlightExplorer() {
  const response = useSearchStore((state) => state.response);
  const comparedIds = useSearchStore((state) => state.comparedIds);
  const setSearch = useSearchStore((state) => state.setSearch);
  const toggleCompared = useSearchStore((state) => state.toggleCompared);
  const clearComparison = useSearchStore((state) => state.clearComparison);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('score');

  const search = useMutation({
    mutationFn: (request: SearchRequest) => apiFetch<SearchResponse>('/flights/search', { method: 'POST', body: request }),
    onSuccess: (result, request) => {
      setSearch(request, result);
      requestAnimationFrame(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    },
  });

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const searchWithTool = async (input: unknown) => {
      const value = input as Partial<SearchRequest>;
      if (!value.origin || !value.destination || !value.departure_date) {
        throw new Error('origin, destination, and departure_date are required');
      }
      const request: SearchRequest = {
        origin: value.origin.toUpperCase(),
        destination: value.destination.toUpperCase(),
        departure_date: value.departure_date,
        adults: value.adults ?? 1,
        cabin: value.cabin ?? 'economy',
        max_stops: value.max_stops ?? 2,
        currency: value.currency ?? 'INR',
        profile: value.profile ?? 'balanced',
        checked_bag_required: value.checked_bag_required ?? false,
        value_of_time: value.value_of_time ?? 500,
      };
      const result = await apiFetch<SearchResponse>('/flights/search', { method: 'POST', body: request });
      setSearch(request, result);
      return {
        resultCount: result.offers.length,
        smartPickId: result.recommendations.smart_pick_id,
        providerMode: result.meta.provider_mode,
      };
    };
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'search_flights',
            title: 'Search and rank flights',
            description: 'Search normalized flight offers and rank them by total journey value in the visible AeroOpt results.',
            inputSchema: {
              type: 'object',
              properties: {
                origin: { type: 'string', pattern: '^[A-Za-z]{3}$' },
                destination: { type: 'string', pattern: '^[A-Za-z]{3}$' },
                departure_date: { type: 'string', format: 'date' },
                adults: { type: 'integer', minimum: 1, maximum: 9 },
                cabin: { enum: ['economy', 'premium_economy', 'business', 'first'] },
                max_stops: { type: 'integer', minimum: 0, maximum: 4 },
                profile: { enum: ['budget', 'business', 'comfort', 'family', 'balanced'] },
              },
              required: ['origin', 'destination', 'departure_date'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: searchWithTool,
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {
      // WebMCP is optional and feature-detected; the visible search remains fully functional.
    }
    return () => lifecycle.abort();
  }, [setSearch]);

  const sortedOffers = useMemo(() => {
    if (!response) return [];
    return [...response.offers].sort((a, b) => {
      if (sortMode === 'price') return a.offer.total_price - b.offer.total_price;
      if (sortMode === 'duration') return a.offer.duration_minutes - b.offer.duration_minutes;
      if (sortMode === 'risk') return b.score.connection_risk_score - a.score.connection_risk_score;
      return b.score.overall_score - a.score.overall_score;
    });
  }, [response, sortMode]);
  const comparedOffers = response?.offers.filter((item) => comparedIds.includes(item.offer.id)) ?? [];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#07162b] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-[62%_center] opacity-50"
          style={{ backgroundImage: "url('/airport-blue-hour.png')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#061226_4%,rgba(6,18,38,.94)_39%,rgba(6,18,38,.38)_76%,rgba(6,18,38,.78)_100%)]" />
        <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-10 lg:px-8 lg:pb-20 lg:pt-14">
          <div className="mb-7 max-w-2xl">
            <Badge className="mb-4 border-cyan-200/20 bg-cyan-200/10 text-cyan-100" variant="outline"><Sparkles className="size-3.5" /> Decisions beyond the ticket price</Badge>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">Find the flight that earns your time.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Compare total journey cost, connection risk, baggage and schedule—then see why one option fits you best.</p>
          </div>
          <FlightSearchPanel onSearch={(request) => search.mutate(request)} pending={search.isPending} />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-cyan-300" /> Rechecks live prices when a provider is configured</span>
            <span className="flex items-center gap-2"><Clock3 className="size-4 text-cyan-300" /> Deterministic journey scoring</span>
          </div>
        </div>
      </section>

      <section className="scroll-mt-20 bg-slate-50 px-5 py-10 lg:px-8 lg:py-14" id="results">
        <div className="mx-auto max-w-[1240px]">
          {search.isPending && <SearchSkeleton />}
          {search.error && (
            <Alert className="mx-auto max-w-2xl border-red-200 bg-red-50" variant="destructive">
              <AlertCircle />
              <AlertTitle>We couldn’t search these flights</AlertTitle>
              <AlertDescription>{search.error instanceof Error ? search.error.message : 'Try again with different details.'}</AlertDescription>
            </Alert>
          )}
          {!response && !search.isPending && !search.error && (
            <Empty className="mx-auto max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white py-16">
              <EmptyHeader>
                <EmptyTitle>Your best options will appear here</EmptyTitle>
                <EmptyDescription>Search a route to compare price, time, baggage, reliability, flexibility and connection risk.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {response && !search.isPending && (
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">Recommended ways to fly</h2>
                      {response.meta.provider_mode === 'demo' && <Badge className="border-amber-200 bg-amber-50 text-amber-800" variant="outline">Demo fares</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Ranked for your selected preference profile.</p>
                  </div>
                  {response.meta.cached && <span className="flex items-center gap-1 text-xs text-slate-500"><CheckCircle2 className="size-3.5 text-emerald-500" /> Cached search snapshot</span>}
                </div>
                <RecommendationStrip response={response} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-7">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">All {response.offers.length} options</h2>
                  <p className="text-sm text-slate-500">{response.meta.price_disclaimer}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Filter className="size-4" /> Sort
                  <NativeSelect onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
                    <NativeSelectOption value="score">Travel score</NativeSelectOption>
                    <NativeSelectOption value="price">Lowest price</NativeSelectOption>
                    <NativeSelectOption value="duration">Shortest duration</NativeSelectOption>
                    <NativeSelectOption value="risk">Lowest risk</NativeSelectOption>
                  </NativeSelect>
                </label>
              </div>
              <div className="space-y-4">
                {sortedOffers.map((item) => (
                  <FlightCard compared={comparedIds.includes(item.offer.id)} item={item} key={item.offer.id} onCompare={() => toggleCompared(item.offer.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {comparedOffers.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92%,620px)] items-center justify-between rounded-2xl border border-white/10 bg-[#07162b] px-4 py-3 text-white shadow-2xl">
          <div>
            <p className="font-semibold">{comparedOffers.length} flight{comparedOffers.length > 1 ? 's' : ''} selected</p>
            <button className="text-xs text-slate-300 hover:text-white" onClick={clearComparison}>Clear comparison</button>
          </div>
          <Button className="bg-cyan-300 text-[#061226] hover:bg-cyan-200" disabled={comparedOffers.length < 2} onClick={() => setComparisonOpen(true)}>
            Compare now
          </Button>
        </div>
      )}
      <ComparisonSheet offers={comparedOffers} onOpenChange={setComparisonOpen} onRemove={toggleCompared} open={comparisonOpen} />
    </>
  );
}
