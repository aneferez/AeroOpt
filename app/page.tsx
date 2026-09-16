import { AppHeader } from '@/components/aeroopt/app-header';
import { FlightExplorer } from '@/components/aeroopt/flight-explorer';

function normalizeCode(value: string | undefined): string | undefined {
  const code = value?.toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : undefined;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />
      <FlightExplorer initialDestination={normalizeCode(to)} initialOrigin={normalizeCode(from)} />
    </main>
  );
}
