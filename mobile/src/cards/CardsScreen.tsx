import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";

export function CardsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();

  return (
    <SafeAreaView
      testID="cards-screen"
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={{ flex: 1, padding: theme.pad, justifyContent: "center", gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{t("cards.title")}</Text>
        <Text testID="cards-empty" style={{ color: theme.dimmed, fontSize: 16 }}>
          {t("cards.empty")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
