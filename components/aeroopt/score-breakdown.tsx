'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { ScoreBreakdown } from '@/types/travel';

const fields: [keyof ScoreBreakdown, string][] = [
  ['price_score', 'Price'],
  ['duration_score', 'Duration'],
  ['layover_score', 'Layover'],
  ['reliability_score', 'Reliability'],
  ['baggage_score', 'Baggage'],
  ['schedule_score', 'Schedule'],
  ['airport_convenience_score', 'Airport convenience'],
  ['fare_flexibility_score', 'Fare flexibility'],
  ['connection_risk_score', 'Connection risk'],
];

export function ScoreBreakdownDialog({ score }: { score: ScoreBreakdown }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-auto p-0 text-blue-700" variant="link" />}>Why this score?</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Travel score breakdown</DialogTitle>
          <DialogDescription>The score is deterministic and uses the profile weights shown below. No LLM ranks flights.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map(([field, label]) => {
            const value = Number(score[field]);
            return (
              <div className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3" key={field}>
                <span className="text-sm text-slate-600">{label}</span>
                <Progress value={value} />
                <span className="text-right text-sm font-semibold">{Math.round(value)}</span>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold">What moved this result</p>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            {score.explanation_factors.map((factor) => <li key={factor}>• {factor}</li>)}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
