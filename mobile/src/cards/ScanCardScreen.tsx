import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../theme";
import { AppButton, ErrorBanner, Field } from "../ui";
import { addCard } from "./loyaltyCards";

const SCANNABLE_SYMBOLOGIES = ["qr", "code128", "ean13"] as const;

type ScannableSymbology = (typeof SCANNABLE_SYMBOLOGIES)[number];

type ScannedCode = {
  symbology: ScannableSymbology;
  payload: string;
};

function isScannableSymbology(type: string): type is ScannableSymbology {
  return (SCANNABLE_SYMBOLOGIES as readonly string[]).includes(type);
}

export function ScanCardScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<ScannedCode | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const acceptScan = useRef(true);
  const savingRef = useRef(false);

  function leave() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  function onBarcodeScanned(result: BarcodeScanningResult) {
    if (!acceptScan.current || !isScannableSymbology(result.type)) {
      return;
    }
    if (typeof result.data !== "string" || result.data.length === 0) {
      return;
    }
    acceptScan.current = false;
    setScanned({ symbology: result.type, payload: result.data });
  }

  function rescan() {
    if (savingRef.current) {
      return;
    }
    acceptScan.current = true;
    setScanned(null);
    setName("");
    setSaveError(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!scanned || trimmed.length === 0 || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await addCard({
        name: trimmed,
        symbology: scanned.symbology,
        payload: scanned.payload,
      });
      router.replace("/");
    } catch {
      savingRef.current = false;
      setSaving(false);
      setSaveError(t("cards.saveError"));
    }
  }

  if (scanned) {
    return (
      <SafeAreaView
        testID="scan-screen"
        edges={["top"]}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <View style={{ padding: theme.pad, gap: 12 }}>
          <AppButton
            label={t("cards.back")}
            onPress={rescan}
            variant="subtle"
            disabled={saving}
            testID="scan-back"
          />
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{t("cards.nameTitle")}</Text>
          <Field
            label={t("cards.nameLabel")}
            accessibilityLabel={t("cards.nameLabel")}
            value={name}
            onChangeText={setName}
            testID="scan-name"
            autoFocus
          />
          {saveError ? <ErrorBanner message={saveError} /> : null}
          <AppButton
            label={t("cards.save")}
            onPress={() => {
              void save();
            }}
            disabled={name.trim().length === 0 || saving}
            testID="scan-save"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission?.granted) {
    const denied = permission?.status === "denied";
    const canAsk = permission == null || permission.canAskAgain;
    return (
      <SafeAreaView
        testID="scan-screen"
        edges={["top"]}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <View style={{ padding: theme.pad, gap: 12 }}>
          <AppButton label={t("cards.back")} onPress={leave} variant="subtle" testID="scan-back" />
          <Text
            testID={denied ? "scan-permission-denied" : "scan-camera-needed"}
            style={{ color: theme.text, fontSize: 16 }}
          >
            {denied ? t("cards.permissionDenied") : t("cards.cameraNeeded")}
          </Text>
          {canAsk ? (
            <AppButton
              label={t("cards.allowCamera")}
              onPress={() => {
                void requestPermission();
              }}
              testID="scan-allow"
            />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="scan-screen" edges={["top"]} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: theme.pad, gap: 12 }}>
        <AppButton label={t("cards.back")} onPress={leave} variant="subtle" testID="scan-back" />
        <Text style={{ color: theme.text, fontSize: 16 }}>{t("cards.scanHint")}</Text>
      </View>
      <View testID="scan-camera" style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...SCANNABLE_SYMBOLOGIES] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      </View>
    </SafeAreaView>
  );
}
