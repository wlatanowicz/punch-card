import { useLocalSearchParams } from "expo-router";

import { CardDetailScreen } from "../../src/cards/CardDetailScreen";

export default function CardRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const cardId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <CardDetailScreen cardId={cardId ?? ""} />;
}
