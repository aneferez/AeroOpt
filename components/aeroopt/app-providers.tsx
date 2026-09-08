'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { TokenResponse } from '@/types/travel';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    apiFetch<TokenResponse>('/auth/refresh', { method: 'POST', auth: false })
      .then((session) => setSession(session.access_token, session.user))
      .catch(() => clearSession());
  }, [clearSession, setSession]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
