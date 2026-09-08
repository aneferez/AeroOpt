import { Skeleton } from '@/components/ui/skeleton';

export function SearchSkeleton() {
  return (
    <output className="block space-y-4" aria-label="Loading flight results">
      {[1, 2, 3].map((item) => (
        <div className="rounded-2xl border border-slate-200 bg-white p-6" key={item}>
          <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><Skeleton className="h-5 w-36" /></div>
          <div className="mt-8 grid grid-cols-3 gap-8"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        </div>
      ))}
      <span className="sr-only">Loading and scoring flights</span>
    </output>
  );
}
