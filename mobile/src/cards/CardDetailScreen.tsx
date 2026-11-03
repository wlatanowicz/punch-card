import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../ui";
import { CardCodeView } from "./CardCodeView";
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

  function leaveCard() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  async function removeCard() {
    await deleteCard(cardId);
    leaveCard();
  }

  return (
    <SafeAreaView testID="card-detail" edges={["top"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}>
        <AppButton
          label={t("cards.back")}
          onPress={leaveCard}
          variant="subtle"
          testID="card-back"
        />
        {card === undefined ? null : card === null ? (
          <Text testID="card-missing" style={{ color: "#495057", fontSize: 16 }}>
            {t("cards.notFound")}
          </Text>
        ) : (
          <View style={{ gap: 16, flexGrow: 1 }}>
            <Text style={{ color: "#111111", fontSize: 28, fontWeight: "700" }}>{card.name}</Text>
            <View style={{ flexGrow: 1, justifyContent: "center" }}>
              <CardCodeView symbology={card.symbology} payload={card.payload} />
            </View>
            {card.places.length > 0 ? (
              <View testID="card-places" style={{ gap: 8 }}>
                <Text style={{ color: "#495057", fontSize: 14 }}>{t("cards.places")}</Text>
                {card.places.map((place) => (
                  <View key={place.id} testID={`card-place-${place.id}`} style={{ gap: 2 }}>
                    <Text style={{ color: "#111111", fontSize: 16 }}>
                      {place.label ?? t("cards.usedHere")}
                    </Text>
                    <Text style={{ color: "#495057", fontSize: 14 }}>{formatUsedAt(place.usedAt)}</Text>
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
