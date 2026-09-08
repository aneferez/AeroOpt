import { AppHeader } from '@/components/aeroopt/app-header';
import { FlightExplorer } from '@/components/aeroopt/flight-explorer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />
      <FlightExplorer />
    </main>
  );
}
