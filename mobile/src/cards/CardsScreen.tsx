import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";
import { AppButton } from "../ui";
import type { LoyaltyCard } from "./loyaltyCard";
import { listCards } from "./loyaltyCards";

export function CardsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const [cards, setCards] = useState<LoyaltyCard[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listCards().then((loaded) => {
        if (active) {
          setCards(loaded);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView
      testID="cards-screen"
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={{ padding: theme.pad, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{t("cards.title")}</Text>
        <AppButton label={t("cards.scan")} onPress={() => router.push("/scan")} testID="cards-scan" />
        {cards !== null && cards.length === 0 ? (
          <Text testID="cards-empty" style={{ color: theme.dimmed, fontSize: 16 }}>
            {t("cards.empty")}
          </Text>
        ) : null}
        {cards?.map((card) => (
          <Pressable
            key={card.id}
            testID={`card-row-${card.id}`}
            accessibilityRole="button"
            onPress={() => router.push(`/card/${card.id}`)}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: theme.radius,
              padding: theme.pad,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>{card.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
