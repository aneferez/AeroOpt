import { cn } from '@/lib/utils';

export function ScoreDial({ score, size = 'default' }: { score: number; size?: 'small' | 'default' }) {
  const color = score >= 85 ? '#10b981' : score >= 72 ? '#2563eb' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <output
      aria-label={`Travel optimization score ${score} out of 100`}
      className={cn('relative grid shrink-0 place-items-center rounded-full', size === 'small' ? 'size-14' : 'size-[4.5rem]')}
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e7edf5 0deg)` }}
    >
      <span className="absolute inset-[5px] rounded-full bg-white" />
      <span className={cn('relative font-semibold tracking-[-0.04em] text-slate-950', size === 'small' ? 'text-lg' : 'text-2xl')}>
        {Math.round(score)}
      </span>
    </output>
  );
}
