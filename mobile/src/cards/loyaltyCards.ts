import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LoyaltyCard, LoyaltyCardPlace, LoyaltyCardPlaceInput, NewLoyaltyCard } from "./loyaltyCard";

const STORAGE_KEY = "loyalty_cards";

export async function addCard(input: NewLoyaltyCard): Promise<LoyaltyCard> {
  const cards = await readCards();
  const card: LoyaltyCard = {
    id: crypto.randomUUID(),
    name: input.name,
    symbology: input.symbology,
    payload: input.payload,
    places: (input.places ?? []).map(storedPlace),
    updatedAt: new Date().toISOString(),
  };
  cards.push(card);
  await writeCards(cards);
  return card;
}

export async function listCards(): Promise<LoyaltyCard[]> {
  const cards = await readCards();
  return cards.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getCard(id: string): Promise<LoyaltyCard | null> {
  const cards = await readCards();
  return cards.find((card) => card.id === id) ?? null;
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await readCards();
  await writeCards(cards.filter((card) => card.id !== id));
}

function storedPlace(place: LoyaltyCardPlaceInput): LoyaltyCardPlace {
  return {
    id: place.id && place.id.length > 0 ? place.id : crypto.randomUUID(),
    latitude: place.latitude,
    longitude: place.longitude,
    usedAt: place.usedAt,
    label: place.label,
  };
}

async function readCards(): Promise<LoyaltyCard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((item) => {
      const card = parseCard(item);
      return card ? [card] : [];
    });
  } catch {
    return [];
  }
}

async function writeCards(cards: LoyaltyCard[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function parseCard(value: unknown): LoyaltyCard | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.symbology !== "string" ||
    typeof value.payload !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }
  const places = Array.isArray(value.places)
    ? value.places.flatMap((place) => {
        const parsed = parsePlace(place);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    id: value.id,
    name: value.name,
    symbology: value.symbology,
    payload: value.payload,
    places,
    updatedAt: value.updatedAt,
  };
}

function parsePlace(value: unknown): LoyaltyCardPlace | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  if (typeof value.latitude !== "number" || !Number.isFinite(value.latitude)) {
    return null;
  }
  if (typeof value.longitude !== "number" || !Number.isFinite(value.longitude)) {
    return null;
  }
  if (typeof value.usedAt !== "string") {
    return null;
  }
  if (value.label !== null && typeof value.label !== "string") {
    return null;
  }
  return {
    id: value.id,
    latitude: value.latitude,
    longitude: value.longitude,
    usedAt: value.usedAt,
    label: value.label,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
