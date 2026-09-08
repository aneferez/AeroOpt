export type OptimizationProfile = 'budget' | 'business' | 'comfort' | 'family' | 'balanced' | 'custom';

export type AirportSuggestion = {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  score: number;
};

export type FlightSegment = {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  carrier_code: string;
  flight_number: string;
  duration_minutes: number;
  aircraft: string | null;
};

export type FlightOffer = {
  id: string;
  provider: string;
  provider_offer_id: string;
  validating_airline: string;
  airline_name: string;
  currency: string;
  base_price: number;
  total_price: number;
  expected_baggage_fee: number;
  estimated_ground_cost: number;
  duration_minutes: number;
  stops: number;
  total_layover_minutes: number;
  overnight_layover: boolean;
  self_transfer: boolean;
  baggage: {
    cabin_bags: number;
    checked_bags: number;
    checked_weight_kg: number;
  };
  fare: {
    cabin: string;
    fare_brand: string | null;
    changeable: boolean;
    refundable: boolean;
    change_fee: number | null;
  };
  segments: FlightSegment[];
  reliability: number;
  airport_convenience: number;
  connection_risk: number;
  bookable_seats: number | null;
  fetched_at: string;
};

export type ScoreBreakdown = {
  overall_score: number;
  price_score: number;
  duration_score: number;
  layover_score: number;
  reliability_score: number;
  baggage_score: number;
  schedule_score: number;
  airport_convenience_score: number;
  fare_flexibility_score: number;
  connection_risk_score: number;
  estimated_true_cost: number;
  applied_weights: Record<string, number>;
  explanation_factors: string[];
};

export type RankedOffer = {
  offer: FlightOffer;
  score: ScoreBreakdown;
  badges: string[];
};

export type SearchRequest = {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  cabin: 'economy' | 'premium_economy' | 'business' | 'first';
  max_stops: number;
  currency: string;
  profile: OptimizationProfile;
  preferred_departure_period?: 'morning' | 'afternoon' | 'evening' | 'night';
  checked_bag_required: boolean;
  value_of_time: number;
};

export type SearchResponse = {
  offers: RankedOffer[];
  recommendations: {
    smart_pick_id: string;
    cheapest_id: string;
    fastest_id: string;
    best_value_id: string;
    lowest_risk_id: string;
  };
  meta: {
    search_id: string | null;
    provider: string;
    provider_mode: 'live' | 'demo';
    cached: boolean;
    cache_ttl_seconds: number;
    fetched_at: string;
    price_disclaimer: string;
  };
};

export type UserSummary = { id: string; email: string; display_name: string };

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_at: string;
  user: UserSummary;
};

export type SavedFlight = {
  id: string;
  provider: string;
  provider_offer_id: string;
  offer_snapshot: FlightOffer;
  score_snapshot: ScoreBreakdown;
  label: string | null;
  created_at: string;
  updated_at: string;
};

export type PriceAlert = {
  id: string;
  saved_flight_id: string | null;
  origin: string;
  destination: string;
  departure_date: string;
  target_price: number;
  currency: string;
  notification_email: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_price: number | null;
  created_at: string;
  updated_at: string;
};
