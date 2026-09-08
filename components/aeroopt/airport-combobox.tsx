'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { apiFetch } from '@/lib/api';
import type { AirportSuggestion } from '@/types/travel';

const knownAirports: Record<string, AirportSuggestion> = {
  MAA: { iata_code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', score: 1 },
  DXB: { iata_code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', score: 1 },
};

type AirportComboboxProps = {
  label: string;
  value: string;
  onChange: (code: string) => void;
};

export function AirportCombobox({ label, value, onChange }: AirportComboboxProps) {
  const [query, setQuery] = useState(knownAirports[value]?.city ?? value);
  const { data = [], isFetching } = useQuery({
    queryKey: ['airports', query],
    queryFn: () => apiFetch<AirportSuggestion[]>(`/airports?query=${encodeURIComponent(query)}`, { auth: false }),
    enabled: query.trim().length >= 2,
  });
  const selected = data.find((airport) => airport.iata_code === value) ?? knownAirports[value] ?? null;

  return (
    <label className="block min-w-0 rounded-xl px-3 py-2 transition focus-within:bg-slate-50">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <MapPin className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
        <Combobox
          items={data}
          itemToStringLabel={(airport: AirportSuggestion) => `${airport.city} (${airport.iata_code})`}
          isItemEqualToValue={(airport, current) => airport.iata_code === current.iata_code}
          onInputValueChange={(next) => {
            setQuery(next);
            if (/^[a-z]{3}$/i.test(next.trim())) onChange(next.trim().toUpperCase());
          }}
          onValueChange={(airport) => {
            if (airport) {
              onChange(airport.iata_code);
              setQuery(`${airport.city} (${airport.iata_code})`);
            }
          }}
          value={selected}
        >
          <ComboboxInput
            aria-label={`${label} airport`}
            className="h-8 w-full border-0 shadow-none focus-within:ring-0"
            placeholder={isFetching ? 'Searching airports…' : 'City or airport'}
            showTrigger={false}
          />
          <ComboboxContent className="min-w-80">
            <ComboboxEmpty>No matching airports</ComboboxEmpty>
            <ComboboxList>
              {(airport: AirportSuggestion) => (
                <ComboboxItem className="grid grid-cols-[2.5rem_1fr] gap-2 px-2 py-2" key={airport.iata_code} value={airport}>
                  <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-xs font-bold text-slate-700">{airport.iata_code}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{airport.city}</span>
                    <span className="block truncate text-xs text-slate-500">{airport.name}</span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </span>
    </label>
  );
}
