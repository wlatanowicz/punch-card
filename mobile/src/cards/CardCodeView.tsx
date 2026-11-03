import { useTranslation } from "react-i18next";
import { Text, useWindowDimensions, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { renderCardCode } from "./cardCode";

const SCREEN_GUTTER = 32;

export function CardCodeView({ symbology, payload }: { symbology: string; payload: string }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const code = renderCardCode(symbology, payload);

  if (!code.ok) {
    return (
      <View testID="card-code-error" style={{ gap: 8 }}>
        <Text style={{ color: "#C92A2A", fontSize: 16 }}>{t("cards.renderError")}</Text>
        <Text style={{ color: "#495057", fontSize: 14 }}>{t("cards.payload")}</Text>
        <Text testID="card-payload" selectable style={{ color: "#111111", fontSize: 22 }}>
          {payload}
        </Text>
      </View>
    );
  }

  const size = cardCodeSize(code.svg, Math.max(width - SCREEN_GUTTER, 1));
  return (
    <View
      testID="card-code"
      accessibilityLabel={payload}
      style={{ alignItems: "center", backgroundColor: "#FFFFFF" }}
    >
      <SvgXml xml={code.svg} width={size.width} height={size.height} />
    </View>
  );
}

function cardCodeSize(svg: string, maxWidth: number): { width: number; height: number } {
  const match = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg);
  const viewWidth = match ? Number(match[1]) : maxWidth;
  const viewHeight = match ? Number(match[2]) : maxWidth;
  if (viewWidth <= 0 || viewHeight <= 0) {
    return { width: maxWidth, height: maxWidth };
  }
  return { width: maxWidth, height: (viewHeight / viewWidth) * maxWidth };
}
