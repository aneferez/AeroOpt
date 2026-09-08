'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/aeroopt/app-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type Preferences = { id: string; user_id: string; profile: string; weights: Record<string, number> | null; preferred_departure_period: string | null; max_stops: number; checked_bag_required: boolean; value_of_time: number; preferred_airports: string[]; created_at: string; updated_at: string };

export default function PreferencesPage() {
  const user = useAuthStore((state) => state.user);
  const preferences = useQuery({ queryKey: ['preferences'], queryFn: () => apiFetch<Preferences>('/users/preferences'), enabled: !!user });
  const update = useMutation({
    mutationFn: (body: Partial<Preferences>) => apiFetch<Preferences>('/users/preferences', { method: 'PUT', body }),
    onSuccess: () => preferences.refetch(),
  });
  const pref = preferences.data;
  if (!user) return <main className="min-h-screen bg-slate-50"><AppHeader /><div className="mx-auto max-w-xl px-5 py-20"><h1 className="text-4xl font-semibold">Set your travel preferences</h1><p className="mt-4 text-slate-600">Sign in to save a profile that changes how every route is ranked.</p><Button className="mt-6" render={<Link href="/sign-in" />}>Sign in</Button></div></main>;
  return <main className="min-h-screen bg-slate-50"><AppHeader /><section className="mx-auto max-w-3xl px-5 py-12"><p className="text-sm font-semibold uppercase tracking-[.1em] text-blue-700">Preferences</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.045em]">Make the score yours.</h1><p className="mt-3 text-slate-600">Profiles use transparent, deterministic weights. Custom weights can be added later without changing the ranking engine.</p>{preferences.isLoading ? <p className="mt-8 text-slate-500">Loading preferences…</p> : pref && <div className="mt-8 grid gap-6 rounded-2xl border border-slate-200 bg-white p-6"><label className="text-sm font-medium">Optimization profile<NativeSelect className="mt-2 w-full" onChange={(event) => update.mutate({ ...pref, profile: event.target.value })} value={pref.profile}><NativeSelectOption value="balanced">Balanced</NativeSelectOption><NativeSelectOption value="budget">Budget</NativeSelectOption><NativeSelectOption value="business">Business</NativeSelectOption><NativeSelectOption value="comfort">Comfort</NativeSelectOption><NativeSelectOption value="family">Family</NativeSelectOption></NativeSelect></label><label className="text-sm font-medium">Maximum stops<NativeSelect className="mt-2 w-full" onChange={(event) => update.mutate({ ...pref, max_stops: Number(event.target.value) })} value={pref.max_stops}><NativeSelectOption value={0}>Nonstop</NativeSelectOption><NativeSelectOption value={1}>Up to 1 stop</NativeSelectOption><NativeSelectOption value={2}>Up to 2 stops</NativeSelectOption></NativeSelect></label><label className="text-sm font-medium">Value of an hour saved (INR)<Input className="mt-2" defaultValue={pref.value_of_time} min="0" onBlur={(event) => update.mutate({ ...pref, value_of_time: Number(event.target.value) })} type="number" /></label><label className="flex items-center gap-3 text-sm font-medium"><Checkbox checked={pref.checked_bag_required} onCheckedChange={(checked) => update.mutate({ ...pref, checked_bag_required: checked })} /> I usually need a checked bag</label>{update.isSuccess && <output className="text-sm text-emerald-700">Preferences saved.</output>}{update.error && <p className="text-sm text-red-600" role="alert">{update.error instanceof Error ? update.error.message : 'Unable to save preferences.'}</p>}</div>}</section></main>;
}
