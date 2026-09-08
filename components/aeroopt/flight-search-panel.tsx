'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarDays, Search, Sparkles } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { apiFetch } from '@/lib/api';
import type { OptimizationProfile, SearchRequest } from '@/types/travel';
import { AirportCombobox } from './airport-combobox';

type Interpretation = {
  extraction: {
    origin: string | null;
    destination: string | null;
    departure_date: string | null;
    return_date: string | null;
    departure_period: SearchRequest['preferred_departure_period'] | null;
    max_stops: number | null;
    priority: string;
    cabin: SearchRequest['cabin'];
  };
  interpretation: string;
  mode: 'ai' | 'rules';
  ready_to_search: boolean;
};

function dateAfter(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function FlightSearchPanel({ onSearch, pending }: { onSearch: (request: SearchRequest) => void; pending: boolean }) {
  const [origin, setOrigin] = useState('MAA');
  const [destination, setDestination] = useState('DXB');
  const [departureDate, setDepartureDate] = useState(() => dateAfter(42));
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<SearchRequest['cabin']>('economy');
  const [maxStops, setMaxStops] = useState(1);
  const [profile, setProfile] = useState<OptimizationProfile>('balanced');
  const [checkedBag, setCheckedBag] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [formError, setFormError] = useState('');

  const interpret = useMutation({
    mutationFn: () => apiFetch<Interpretation>('/assistant/interpret', { method: 'POST', body: { query: naturalQuery }, auth: false }),
    onSuccess: (result) => {
      setInterpretation(result);
      if (result.extraction.origin) setOrigin(result.extraction.origin);
      if (result.extraction.destination) setDestination(result.extraction.destination);
      if (result.extraction.departure_date) setDepartureDate(result.extraction.departure_date);
      if (result.extraction.return_date) setReturnDate(result.extraction.return_date);
      if (result.extraction.max_stops !== null) setMaxStops(result.extraction.max_stops);
      if (result.extraction.cabin) setCabin(result.extraction.cabin);
      if (result.extraction.priority === 'price') setProfile('budget');
    },
  });

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (origin.length !== 3 || destination.length !== 3) {
      setFormError('Choose a valid origin and destination airport.');
      return;
    }
    if (origin === destination) {
      setFormError('Origin and destination must be different.');
      return;
    }
    setFormError('');
    onSearch({
      origin,
      destination,
      departure_date: departureDate,
      ...(returnDate ? { return_date: returnDate } : {}),
      adults,
      cabin,
      max_stops: maxStops,
      currency: 'INR',
      profile,
      checked_bag_required: checkedBag,
      value_of_time: profile === 'business' ? 1500 : 500,
    });
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md">
        <Sparkles className="ml-2 size-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <Input
          aria-label="Describe your ideal trip"
          className="h-10 border-0 bg-transparent text-white shadow-none placeholder:text-slate-400 focus-visible:ring-0"
          onChange={(event) => setNaturalQuery(event.target.value)}
          placeholder="Try: Cheap Chennai to Dubai next month, Friday evening, max one stop"
          value={naturalQuery}
        />
        <Button
          className="h-9 shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20"
          disabled={naturalQuery.trim().length < 5 || interpret.isPending}
          onClick={() => interpret.mutate()}
          type="button"
          variant="outline"
        >
          {interpret.isPending ? 'Interpreting…' : 'Apply'}
        </Button>
      </div>
      {(interpretation || interpret.error) && (
        <output className="mb-3 block rounded-xl bg-[#0b203b]/90 px-4 py-2 text-sm text-slate-200">
          {interpret.error instanceof Error ? interpret.error.message : `${interpretation?.interpretation} Review the fields, then search.`}
        </output>
      )}
      <form className="rounded-[1.4rem] border border-white/15 bg-white p-3 text-[#102039] shadow-[0_28px_80px_rgba(0,0,0,.34)]" onSubmit={submit}>
        <div className="grid gap-2 lg:grid-cols-[1fr_42px_1fr_1fr_1fr_auto] lg:items-center">
          <AirportCombobox label="From" onChange={setOrigin} value={origin} />
          <Button
            aria-label="Swap airports"
            className="mx-auto hidden rounded-full border-slate-200 text-slate-500 lg:inline-flex"
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <ArrowLeftRight className="size-4" />
          </Button>
          <AirportCombobox label="To" onChange={setDestination} value={destination} />
          <label className="flex min-h-16 items-center gap-3 rounded-xl px-3 transition focus-within:bg-slate-50">
            <CalendarDays className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Depart</span>
              <Input className="h-8 border-0 px-0 text-sm font-medium shadow-none focus-visible:ring-0" min={dateAfter(1)} onChange={(event) => setDepartureDate(event.target.value)} required type="date" value={departureDate} />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 px-2 lg:block lg:px-0">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Travelers</span>
              <NativeSelect className="mt-1 w-full" onChange={(event) => setAdults(Number(event.target.value))} value={adults}>
                {[1, 2, 3, 4, 5, 6].map((count) => <NativeSelectOption key={count} value={count}>{count} adult{count > 1 ? 's' : ''}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            <label className="mt-2 block lg:hidden">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Cabin</span>
              <NativeSelect className="mt-1 w-full" onChange={(event) => setCabin(event.target.value as SearchRequest['cabin'])} value={cabin}>
                <NativeSelectOption value="economy">Economy</NativeSelectOption>
                <NativeSelectOption value="premium_economy">Premium economy</NativeSelectOption>
                <NativeSelectOption value="business">Business</NativeSelectOption>
                <NativeSelectOption value="first">First</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>
          <Button className="h-14 rounded-xl bg-blue-600 px-7 text-base text-white hover:bg-blue-700" disabled={pending} type="submit">
            <Search className="size-4" />
            {pending ? 'Scoring…' : 'Search'}
          </Button>
        </div>
        <details className="group mt-2 border-t border-slate-100 px-3 pt-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-600">Trip preferences <span className="text-slate-400">(optional)</span></summary>
          <div className="mt-3 grid gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm text-slate-600">
              Return date
              <Input className="mt-1" min={departureDate} onChange={(event) => setReturnDate(event.target.value)} type="date" value={returnDate} />
            </label>
            <label className="text-sm text-slate-600">
              Cabin
              <NativeSelect className="mt-1 w-full" onChange={(event) => setCabin(event.target.value as SearchRequest['cabin'])} value={cabin}>
                <NativeSelectOption value="economy">Economy</NativeSelectOption>
                <NativeSelectOption value="premium_economy">Premium economy</NativeSelectOption>
                <NativeSelectOption value="business">Business</NativeSelectOption>
                <NativeSelectOption value="first">First</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="text-sm text-slate-600">
              Maximum stops
              <NativeSelect className="mt-1 w-full" onChange={(event) => setMaxStops(Number(event.target.value))} value={maxStops}>
                <NativeSelectOption value={0}>Nonstop</NativeSelectOption>
                <NativeSelectOption value={1}>Up to 1 stop</NativeSelectOption>
                <NativeSelectOption value={2}>Up to 2 stops</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="text-sm text-slate-600">
              Optimize for
              <NativeSelect className="mt-1 w-full" onChange={(event) => setProfile(event.target.value as OptimizationProfile)} value={profile}>
                <NativeSelectOption value="balanced">Balanced</NativeSelectOption>
                <NativeSelectOption value="budget">Budget</NativeSelectOption>
                <NativeSelectOption value="business">Business</NativeSelectOption>
                <NativeSelectOption value="comfort">Comfort</NativeSelectOption>
                <NativeSelectOption value="family">Family</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="flex items-center gap-2 self-end py-2 text-sm font-medium text-slate-700">
              <Checkbox checked={checkedBag} onCheckedChange={setCheckedBag} />
              Checked bag required
            </label>
          </div>
        </details>
        {formError && <p className="px-3 pt-2 text-sm font-medium text-red-600" role="alert">{formError}</p>}
      </form>
    </div>
  );
}
