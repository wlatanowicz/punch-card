import type { AuthConfig, MeUser } from "@micro-saas/api-client";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api";
import { AuthPanel } from "../auth/AuthPanel";
import { LanguageSelector } from "../i18n/LanguageSelector";
import { clearAccessToken, getAccessToken } from "../session";
import { useAppTheme } from "../theme";
import { AppButton, ErrorBanner } from "../ui";

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [configError, setConfigError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<MeUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  const clearSession = useCallback(() => {
    void clearAccessToken();
    setCurrentUser(null);
  }, []);

  const restoreSession = useCallback(
    async (token: string) => {
      const result = await api.loadMe(token);
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          clearSession();
        }
        return;
      }
      setCurrentUser(result.data);
    },
    [clearSession],
  );

  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
      setConfigError(t("errors.apiBaseNotSet"));
      return;
    }

    void (async () => {
      try {
        const config = await api.fetchAuthConfig();
        if (config) {
          setAuthConfig(config);
        }

        const token = await getAccessToken();
        if (token) {
          await restoreSession(token);
        }
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : t("errors.requestFailed"));
      }
    })();
  }, [restoreSession, t]);

  const methods: AuthConfig = authConfig ?? {
    password: true,
    google: false,
    facebook: false,
  };

  return (
    <SafeAreaView
      testID="settings-screen"
      edges={["top"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={{ padding: theme.pad, paddingBottom: 40 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700", flexShrink: 1 }}>
            {t("settings.title")}
          </Text>
          <LanguageSelector />
        </View>

        {configError ? <ErrorBanner message={configError} /> : null}

        {currentUser ? (
          <View testID="settings-signed-in" style={{ alignItems: "flex-start", gap: 6 }}>
            <Text style={{ color: theme.text, fontWeight: "600" }}>{currentUser.email}</Text>
            <View
              style={{
                borderRadius: 8,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 12 }}>{currentUser.status}</Text>
            </View>
            <AppButton label={t("app.signOut")} variant="subtle" onPress={clearSession} />
          </View>
        ) : null}

        {!configError && !currentUser ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.dimmed, fontSize: 13 }}>{t("app.notSignedIn")}</Text>
            <AuthPanel
              authConfig={methods}
              initialError={authError}
              onSession={(user) => {
                setCurrentUser(user);
                setAuthError(null);
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
