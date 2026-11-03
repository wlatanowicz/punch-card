import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";
import { AppButton } from "../ui";
import type { LoyaltyCard } from "./loyaltyCard";
import { deleteCard, getCard } from "./loyaltyCards";

export function formatUsedAt(usedAt: string): string {
  const date = new Date(usedAt);
  if (Number.isNaN(date.getTime())) {
    return usedAt;
  }
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export function CardDetailScreen({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const [card, setCard] = useState<LoyaltyCard | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void getCard(cardId).then((loaded) => {
      if (active) {
        setCard(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, [cardId]);

  async function removeCard() {
    await deleteCard(cardId);
    router.back();
  }

  return (
    <SafeAreaView
      testID="card-detail"
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={{ padding: theme.pad, gap: 12 }}>
        <AppButton
          label={t("cards.back")}
          onPress={() => router.back()}
          variant="subtle"
          testID="card-back"
        />
        {card === undefined ? null : card === null ? (
          <Text testID="card-missing" style={{ color: theme.dimmed, fontSize: 16 }}>
            {t("cards.notFound")}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{card.name}</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.dimmed, fontSize: 14 }}>{t("cards.symbology")}</Text>
              <Text testID="card-symbology" style={{ color: theme.text, fontSize: 16 }}>
                {card.symbology}
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.dimmed, fontSize: 14 }}>{t("cards.payload")}</Text>
              <Text testID="card-payload" style={{ color: theme.text, fontSize: 16 }}>
                {card.payload}
              </Text>
            </View>
            {card.places.length > 0 ? (
              <View testID="card-places" style={{ gap: 8 }}>
                <Text style={{ color: theme.dimmed, fontSize: 14 }}>{t("cards.places")}</Text>
                {card.places.map((place) => (
                  <View key={place.id} testID={`card-place-${place.id}`} style={{ gap: 2 }}>
                    <Text style={{ color: theme.text, fontSize: 16 }}>
                      {place.label ?? t("cards.usedHere")}
                    </Text>
                    <Text style={{ color: theme.dimmed, fontSize: 14 }}>{formatUsedAt(place.usedAt)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <AppButton label={t("cards.delete")} onPress={() => void removeCard()} testID="card-delete" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
