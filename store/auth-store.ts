'use client';

import { create } from 'zustand';
import type { UserSummary } from '@/types/travel';

type AuthState = {
  accessToken: string | null;
  user: UserSummary | null;
  restoring: boolean;
  setSession: (accessToken: string, user: UserSummary) => void;
  clearSession: () => void;
  setRestoring: (restoring: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  restoring: true,
  setSession: (accessToken, user) => set({ accessToken, user, restoring: false }),
  clearSession: () => set({ accessToken: null, user: null, restoring: false }),
  setRestoring: (restoring) => set({ restoring }),
}));
