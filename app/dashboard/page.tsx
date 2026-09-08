'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, Bookmark, Luggage, Search } from 'lucide-react';
import { AppHeader } from '@/components/aeroopt/app-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type Dashboard = { saved_flights: number; active_alerts: number; upcoming_trips: number; recent_searches: number };
const cards = [{key:'saved_flights',label:'Saved flights',icon:Bookmark},{key:'active_alerts',label:'Active alerts',icon:Bell},{key:'upcoming_trips',label:'Trips in planning',icon:Luggage},{key:'recent_searches',label:'Recent searches',icon:Search}] as const;
export default function DashboardPage() { const user=useAuthStore((s)=>s.user); const q=useQuery({queryKey:['dashboard'],queryFn:()=>apiFetch<Dashboard>('/users/dashboard'),enabled:!!user}); return <main className="min-h-screen bg-slate-50"><AppHeader/><section className="mx-auto max-w-6xl px-5 py-12 lg:px-8"><p className="text-sm font-semibold uppercase tracking-[.1em] text-blue-700">Dashboard</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] text-slate-950">{user ? `Good to see you, ${user.display_name.split(' ')[0]}.` : 'Your travel decision desk.'}</h1>{!user?<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8"><p className="text-slate-600">Sign in to see saved flights, alerts and trip activity.</p><Button className="mt-4" render={<Link href="/sign-in"/>}>Sign in</Button></div>:<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({key,label,icon:Icon})=><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={key}><Icon className="size-5 text-blue-600"/><p className="mt-6 text-3xl font-semibold">{q.isLoading?<Skeleton className="h-9 w-12"/>:q.data?.[key]??0}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>)}</div>}<div className="mt-10 rounded-2xl bg-[#07162b] p-7 text-white"><h2 className="text-xl font-semibold">Start with a route, not a spreadsheet.</h2><p className="mt-2 text-slate-300">AeroOpt sorts live offers by the parts of the journey you value.</p><Button className="mt-5 bg-cyan-300 text-[#061226] hover:bg-cyan-200" render={<Link href="/"/>}>Search flights</Button></div></section></main>; }
