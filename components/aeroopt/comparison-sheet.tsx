'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDuration, formatMoney } from '@/lib/format';
import type { RankedOffer } from '@/types/travel';

export function ComparisonSheet({
  offers,
  open,
  onOpenChange,
  onRemove,
}: {
  offers: RankedOffer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const rows: [string, (item: RankedOffer) => React.ReactNode][] = [
    ['Travel score', (item) => <strong>{Math.round(item.score.overall_score)}/100</strong>],
    ['Ticket price', (item) => formatMoney(item.offer.total_price, item.offer.currency)],
    ['True cost estimate', (item) => formatMoney(item.score.estimated_true_cost, item.offer.currency)],
    ['Duration', (item) => formatDuration(item.offer.duration_minutes)],
    ['Stops', (item) => item.offer.stops || 'Nonstop'],
    ['Checked baggage', (item) => item.offer.baggage.checked_weight_kg ? `${item.offer.baggage.checked_weight_kg} kg` : 'Not included'],
    ['Reliability', (item) => `${Math.round(item.score.reliability_score)} / 100`],
    ['Connection safety', (item) => `${Math.round(item.score.connection_risk_score)} / 100`],
    ['Fare flexibility', (item) => item.offer.fare.changeable ? 'Changes allowed' : 'Restricted'],
  ];
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full max-w-4xl overflow-y-auto sm:max-w-4xl" side="right">
        <SheetHeader>
          <SheetTitle>Compare the whole journey</SheetTitle>
          <SheetDescription>Up to three flights, using the same deterministic score and preference profile.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Measure</TableHead>
                {offers.map((item) => (
                  <TableHead className="min-w-40" key={item.offer.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.offer.airline_name}</span>
                      <Button aria-label={`Remove ${item.offer.airline_name} from comparison`} onClick={() => onRemove(item.offer.id)} size="icon-sm" variant="ghost"><X /></Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([label, render]) => (
                <TableRow key={label}>
                  <TableCell className="font-medium text-slate-600">{label}</TableCell>
                  {offers.map((item) => <TableCell key={item.offer.id}>{render(item)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
