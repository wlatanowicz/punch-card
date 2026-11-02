import * as SecureStore from "expo-secure-store";

import {
  clearAccessToken,
  getAccessToken,
  getSavedLanguage,
  setAccessToken,
  setSavedLanguage,
} from "./session";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("session storage", () => {
  it("reads and writes the access token under access_token", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue("tok");

    await expect(getAccessToken()).resolves.toBe("tok");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("access_token");

    await setAccessToken("next");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("access_token", "next");

    await clearAccessToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
  });

  it("reads and writes the saved language under app_language", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue("pl");

    await expect(getSavedLanguage()).resolves.toBe("pl");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("app_language");

    await setSavedLanguage("de");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("app_language", "de");
  });
});
