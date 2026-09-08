'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { AppHeader } from '@/components/aeroopt/app-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { TokenResponse } from '@/types/travel';

export default function SignInPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const setSession = useAuthStore((state) => state.setSession);
  const auth = useMutation({
    mutationFn: () => apiFetch<TokenResponse>(`/auth/${mode === 'login' ? 'login' : 'register'}`, {
      method: 'POST', auth: false, body: mode === 'login' ? { email, password } : { email, password, display_name: displayName },
    }),
    onSuccess: (result) => setSession(result.access_token, result.user),
  });
  function submit(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); auth.mutate(); }
  return <main className="min-h-screen bg-slate-50"><AppHeader /><section className="mx-auto grid max-w-5xl gap-10 px-5 py-16 lg:grid-cols-[1fr_420px] lg:py-24"><div><p className="text-sm font-semibold uppercase tracking-[.1em] text-blue-700">AeroOpt account</p><h1 className="mt-4 text-5xl font-semibold tracking-[-.05em] text-slate-950">Keep your trip decisions in one place.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">Save top journeys, set price targets and keep your optimization profile aligned with how you travel.</p></div><form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}><h2 className="text-2xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>{mode === 'register' && <label className="mt-6 block text-sm font-medium">Name<Input className="mt-2" onChange={(e) => setDisplayName(e.target.value)} required value={displayName}/></label>}<label className="mt-6 block text-sm font-medium">Email<Input className="mt-2" onChange={(e) => setEmail(e.target.value)} required type="email" value={email}/></label><label className="mt-5 block text-sm font-medium">Password<Input className="mt-2" minLength={mode === 'register' ? 10 : 1} onChange={(e) => setPassword(e.target.value)} required type="password" value={password}/></label>{auth.error && <p className="mt-4 text-sm text-red-600" role="alert">{auth.error instanceof Error ? auth.error.message : 'Unable to continue.'}</p>}<Button className="mt-6 h-11 w-full" disabled={auth.isPending} type="submit">{auth.isPending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button><button className="mt-5 w-full text-sm text-blue-700 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); auth.reset(); }} type="button">{mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button><p className="mt-6 text-center text-xs text-slate-500"><Link className="underline" href="/">Continue without an account</Link></p></form></section></main>;
}
