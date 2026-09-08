'use client';

import { create } from 'zustand';
import type { SearchRequest, SearchResponse } from '@/types/travel';

type SearchState = {
  request: SearchRequest | null;
  response: SearchResponse | null;
  comparedIds: string[];
  setSearch: (request: SearchRequest, response: SearchResponse) => void;
  toggleCompared: (offerId: string) => void;
  clearComparison: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  request: null,
  response: null,
  comparedIds: [],
  setSearch: (request, response) => set({ request, response, comparedIds: [] }),
  toggleCompared: (offerId) =>
    set((state) => {
      if (state.comparedIds.includes(offerId)) {
        return { comparedIds: state.comparedIds.filter((id) => id !== offerId) };
      }
      if (state.comparedIds.length >= 3) return state;
      return { comparedIds: [...state.comparedIds, offerId] };
    }),
  clearComparison: () => set({ comparedIds: [] }),
}));
