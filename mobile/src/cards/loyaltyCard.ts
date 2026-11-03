export interface LoyaltyCardPlace {
  id: string;
  latitude: number;
  longitude: number;
  usedAt: string;
  label: string | null;
}

export interface LoyaltyCardPlaceInput {
  id?: string;
  latitude: number;
  longitude: number;
  usedAt: string;
  label: string | null;
}

export interface LoyaltyCard {
  id: string;
  name: string;
  symbology: string;
  payload: string;
  places: LoyaltyCardPlace[];
  updatedAt: string;
}

export interface NewLoyaltyCard {
  name: string;
  symbology: string;
  payload: string;
  places?: LoyaltyCardPlaceInput[];
}
