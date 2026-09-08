import { ArrowDown, Banknote, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDuration, formatMoney } from '@/lib/format';
import type { RankedOffer, SearchResponse } from '@/types/travel';

const configs = [
  { key: 'smart_pick_id' as const, label: 'Smart Pick', icon: Sparkles, tone: 'bg-blue-600 text-white' },
  { key: 'cheapest_id' as const, label: 'Cheapest', icon: Banknote, tone: 'bg-white text-slate-950' },
  { key: 'fastest_id' as const, label: 'Fastest', icon: Clock3, tone: 'bg-white text-slate-950' },
  { key: 'lowest_risk_id' as const, label: 'Lowest risk', icon: ShieldCheck, tone: 'bg-white text-slate-950' },
];

export function RecommendationStrip({ response }: { response: SearchResponse }) {
  const find = (id: string): RankedOffer => response.offers.find((item) => item.offer.id === id) ?? response.offers[0];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {configs.map(({ key, label, icon: Icon, tone }) => {
        const item = find(response.recommendations[key]);
        return (
          <a className={`group rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`} href={`#offer-${item.offer.id}`} key={key}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4" /> {label}</span>
              <ArrowDown className="size-4 opacity-50 transition group-hover:translate-y-0.5" />
            </div>
            <p className="mt-4 text-xl font-semibold tracking-[-0.03em]">{item.offer.airline_name}</p>
            <p className={`mt-1 text-sm ${tone.includes('blue') ? 'text-blue-100' : 'text-slate-500'}`}>
              {formatMoney(item.offer.total_price, item.offer.currency)} · {formatDuration(item.offer.duration_minutes)} · score {Math.round(item.score.overall_score)}
            </p>
          </a>
        );
      })}
    </div>
  );
}
