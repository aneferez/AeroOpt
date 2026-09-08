'use client';

import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BriefcaseBusiness, Check, Clock3, Heart, Luggage, Plane, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';
import { formatDate, formatDuration, formatMoney, formatTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth-store';
import type { RankedOffer, SavedFlight } from '@/types/travel';
import { ScoreBreakdownDialog } from './score-breakdown';
import { ScoreDial } from './score-dial';

type FlightCardProps = {
  item: RankedOffer;
  compared: boolean;
  onCompare: () => void;
};

export function FlightCard({ item, compared, onCompare }: FlightCardProps) {
  const { offer, score, badges } = item;
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const user = useAuthStore((state) => state.user);
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  const save = useMutation({
    mutationFn: () => apiFetch<SavedFlight>('/saved-flights', {
      method: 'POST',
      body: {
        provider: offer.provider,
        provider_offer_id: offer.provider_offer_id,
        offer_snapshot: offer,
        score_snapshot: score,
      },
    }),
    onSuccess: () => setSaved(true),
  });

  return (
    <motion.article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.06)]"
      id={`offer-${offer.id}`}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {badges.includes('Smart Pick') && (
        <div className="flex items-center justify-between bg-[#0c1e38] px-5 py-2 text-sm text-white">
          <span className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-cyan-300" /> Smart Pick for this profile</span>
          <span className="text-xs text-slate-300">Best total journey value</span>
        </div>
      )}
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:p-6">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{offer.validating_airline}</span>
            <div className="mr-auto">
              <p className="font-semibold text-slate-950">{offer.airline_name}</p>
              <p className="text-xs text-slate-500">{first.flight_number} · {offer.fare.fare_brand ?? 'Standard fare'}</p>
            </div>
            {badges.filter((badge) => badge !== 'Smart Pick').map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatTime(first.departure_at)}</p>
              <p className="mt-1 text-sm font-semibold">{first.origin}</p>
              <p className="text-xs text-slate-500">{formatDate(first.departure_at)}</p>
            </div>
            <div className="min-w-28 text-center">
              <p className="mb-1 text-xs text-slate-500">{formatDuration(offer.duration_minutes)}</p>
              <div className="relative h-px bg-slate-300 before:absolute before:left-0 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-blue-600 after:absolute after:right-0 after:top-1/2 after:size-1.5 after:-translate-y-1/2 after:rounded-full after:bg-blue-600" />
              <p className="mt-2 text-xs font-medium text-slate-600">{offer.stops ? `${offer.stops} stop${offer.stops > 1 ? 's' : ''}` : 'Nonstop'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatTime(last.arrival_at)}</p>
              <p className="mt-1 text-sm font-semibold">{last.destination}</p>
              <p className="text-xs text-slate-500">{formatDate(last.arrival_at)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><Luggage className="size-4 text-slate-400" /> {offer.baggage.checked_weight_kg ? `${offer.baggage.checked_weight_kg} kg checked` : 'Cabin bag only'}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="size-4 text-slate-400" /> {Math.round(offer.reliability * 100)}% reliability signal</span>
            <span className="flex items-center gap-1.5"><BriefcaseBusiness className="size-4 text-slate-400" /> {offer.fare.changeable ? 'Changes allowed' : 'Restricted changes'}</span>
          </div>
        </div>

        <aside className="flex min-w-[220px] items-center justify-between gap-5 border-t border-slate-100 pt-5 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-center gap-3">
            <ScoreDial score={score.overall_score} />
            <div className="lg:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Travel score</p>
              <ScoreBreakdownDialog score={score} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatMoney(offer.total_price, offer.currency)}</p>
            <p className="text-xs text-slate-500">per traveler</p>
            <p className="mt-1 text-xs text-slate-500">True cost est. {formatMoney(score.estimated_true_cost, offer.currency)}</p>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={compared} onCheckedChange={onCompare} />
          Compare
        </label>
        <div className="flex items-center gap-2">
          <Button disabled={!user || save.isPending || saved} onClick={() => save.mutate()} variant="outline">
            {saved ? <Check className="size-4" /> : <Heart className="size-4" />}
            {saved ? 'Saved' : user ? 'Save' : 'Sign in to save'}
          </Button>
          <Button onClick={() => setExpanded((value) => !value)}>
            <Plane className="size-4" />
            {expanded ? 'Hide details' : 'View details'}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.segments.map((segment) => (
              <div className="rounded-xl border border-slate-200 p-4" key={`${segment.flight_number}-${segment.departure_at}`}>
                <p className="font-semibold">{segment.origin} → {segment.destination}</p>
                <p className="mt-1 text-sm text-slate-600">{segment.flight_number} · {segment.aircraft ?? 'Aircraft to be confirmed'}</p>
                <p className="mt-1 text-sm text-slate-500">{formatTime(segment.departure_at)} – {formatTime(segment.arrival_at)} · {formatDuration(segment.duration_minutes)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Fare must be revalidated with {offer.provider} before any booking handoff. AeroOpt does not sell or issue tickets.</p>
        </div>
      )}
    </motion.article>
  );
}
