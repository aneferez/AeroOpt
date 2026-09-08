'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '@/components/aeroopt/app-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type Result={interpretation:string;mode:'ai'|'rules';ready_to_search:boolean;extraction:Record<string,unknown>};
export default function AssistantPage(){const [query,setQuery]=useState('Find me a cheap flight from Chennai to Dubai next month, leaving Friday evening and returning Sunday night, maximum one stop.');const interpret=useMutation({mutationFn:()=>apiFetch<Result>('/assistant/interpret',{method:'POST',body:{query},auth:false})});return <main className="min-h-screen bg-slate-50"><AppHeader/><section className="mx-auto max-w-4xl px-5 py-12"><div className="rounded-3xl bg-[#07162b] p-8 text-white sm:p-12"><Sparkles className="size-6 text-cyan-300"/><h1 className="mt-5 text-4xl font-semibold tracking-[-.05em]">Describe the trip in your own words.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">AeroOpt converts natural language into a validated flight search. It never lets an LLM decide the travel score.</p><Textarea className="mt-8 min-h-32 border-white/15 bg-white/10 text-white placeholder:text-slate-400" onChange={e=>setQuery(e.target.value)} value={query}/><Button className="mt-4 bg-cyan-300 text-[#061226] hover:bg-cyan-200" disabled={interpret.isPending} onClick={()=>interpret.mutate()}>{interpret.isPending?'Interpreting…':'Interpret request'}</Button></div>{interpret.data&&<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-semibold uppercase tracking-[.1em] text-blue-700">{interpret.data.mode==='ai'?'AI-validated extraction':'Rule-based extraction'}</p><h2 className="mt-3 text-2xl font-semibold">{interpret.data.interpretation}</h2><pre className="mt-5 overflow-auto rounded-xl bg-slate-950 p-4 text-sm text-cyan-100">{JSON.stringify(interpret.data.extraction,null,2)}</pre><Button className="mt-5" render={<Link href="/"/>}>Search this trip <ArrowRight/></Button></div>}{interpret.error&&<p className="mt-6 text-red-600">{interpret.error instanceof Error?interpret.error.message:'Unable to interpret that request.'}</p>}</section></main>}
