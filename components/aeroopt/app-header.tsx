'use client';

import Link from 'next/link';
import { Bell, CircleUserRound, LogOut, Menu, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const links = [
  { href: '/', label: 'Explore' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/saved', label: 'Saved & alerts' },
  { href: '/preferences', label: 'Preferences' },
  { href: '/assistant', label: 'Travel assistant' },
];

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearSession();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#061226]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
        <Link className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]" href="/">
          <span className="grid size-8 place-items-center rounded-full bg-cyan-300 text-[#061226]">
            <Plane className="size-4 -rotate-45" aria-hidden="true" />
          </span>
          AeroOpt
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-300 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link className="transition hover:text-white" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button aria-label="Saved price alerts" className="text-slate-300 hover:bg-white/10 hover:text-white" render={<Link href="/saved" />} size="icon" variant="ghost">
            <Bell className="size-4" />
          </Button>
          {user ? (
            <Button className="hidden border-white/15 bg-white/8 text-white hover:bg-white/14 sm:inline-flex" onClick={logout} variant="outline">
              <LogOut className="size-4" />
              Sign out
            </Button>
          ) : (
            <Button className="hidden border-white/15 bg-white/8 text-white hover:bg-white/14 sm:inline-flex" render={<Link href="/sign-in" />} variant="outline">
              <CircleUserRound className="size-4" />
              Sign in
            </Button>
          )}
          <Sheet>
            <SheetTrigger render={<Button aria-label="Open navigation" className="text-white lg:hidden" size="icon" variant="ghost" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="w-[88vw] max-w-sm bg-[#07162b] text-white" side="right">
              <SheetHeader>
                <SheetTitle className="text-white">AeroOpt</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-1 px-3" aria-label="Mobile navigation">
                {links.map((link) => (
                  <Link className="rounded-lg px-3 py-3 text-base text-slate-200 hover:bg-white/8" href={link.href} key={link.href}>
                    {link.label}
                  </Link>
                ))}
                <Link className="mt-3 rounded-lg border border-white/15 px-3 py-3 text-base" href="/sign-in">
                  {user ? user.display_name : 'Sign in'}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
