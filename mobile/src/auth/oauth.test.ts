import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { WebBrowserResultType } from "expo-web-browser";

import { oauthRedirectUri, startOAuth } from "./oauth";

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "punch-card://oauth"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("../api", () => ({
  api: {
    oauthStartUrl: (provider: string, redirectUri: string) =>
      `https://api.example.test/api/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`,
  },
}));

const startUrl = "https://api.example.test/api/auth/google?redirect_uri=punch-card%3A%2F%2Foauth";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("oauthRedirectUri", () => {
  it("uses the punch-card scheme and oauth path", () => {
    expect(oauthRedirectUri()).toBe("punch-card://oauth");
    expect(AuthSession.makeRedirectUri).toHaveBeenCalledWith({ scheme: "punch-card", path: "oauth" });
  });
});

describe("startOAuth", () => {
  it("returns an empty result when the browser session is dismissed", async () => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: "dismiss" as WebBrowserResultType,
    });

    await expect(startOAuth("google")).resolves.toEqual({});
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(startUrl, "punch-card://oauth");
  });

  it("parses the access token from a successful redirect", async () => {
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: "success",
      url: "punch-card://oauth?access_token=xyz&token_type=bearer",
    });

    await expect(startOAuth("google")).resolves.toEqual({ accessToken: "xyz" });
  });
});
