import { fireEvent, renderRouter, waitFor } from "expo-router/testing-library";

import RootLayout from "../app/_layout";
import CustomerTabs from "../app/(tabs)/_layout";
import CardsRoute from "../app/(tabs)/index";
import SettingsRoute from "../app/(tabs)/settings";
import StampRoute from "../app/(tabs)/stamp";
import { api } from "./api";
import i18n from "./i18n";
import { getAccessToken } from "./session";

jest.mock("./api", () => ({
  api: {
    fetchAuthConfig: jest.fn(),
    loadMe: jest.fn(),
  },
}));

jest.mock("./session", () => ({
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
  getSavedLanguage: jest.fn(async () => null),
  setSavedLanguage: jest.fn(),
}));

const fetchAuthConfig = api.fetchAuthConfig as jest.Mock;
const loadMe = api.loadMe as jest.Mock;
const readAccessToken = getAccessToken as jest.Mock;

const signedInUser = {
  id: "user-1",
  email: "ada@example.com",
  status: "active",
};

function customerRoutes() {
  return {
    _layout: RootLayout,
    "(tabs)/_layout": CustomerTabs,
    "(tabs)/index": CardsRoute,
    "(tabs)/stamp": StampRoute,
    "(tabs)/settings": SettingsRoute,
  };
}

async function renderCustomerTabs(initialUrl = "/") {
  const pending = renderRouter(customerRoutes(), { initialUrl });
  jest.useRealTimers();
  return await pending;
}

describe("customer tabs", () => {
  beforeEach(async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
    fetchAuthConfig.mockReset();
    loadMe.mockReset();
    readAccessToken.mockReset();
    fetchAuthConfig.mockResolvedValue({ password: true, google: false, facebook: false });
    loadMe.mockResolvedValue({ ok: false, status: 401, errorCode: "not_authenticated" });
    readAccessToken.mockResolvedValue(null);
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows empty cards and stamp destinations and leaves the scaffold out", async () => {
    const view = await renderCustomerTabs();

    expect(view.getByTestId("cards-screen")).toBeTruthy();
    expect(view.getByText("No loyalty cards yet.")).toBeTruthy();
    expect(view.queryByText("Database configured:")).toBeNull();
    expect(view.queryByText("No items yet.")).toBeNull();

    fireEvent.press(view.getByTestId("tab-stamp"));

    expect(await view.findByText("Your stamp code will show up here.")).toBeTruthy();
    expect(view.getByTestId("stamp-screen")).toBeTruthy();

    fireEvent.press(view.getByTestId("tab-settings"));

    expect(await view.findByText("Not signed in")).toBeTruthy();
    expect(view.getByTestId("settings-screen")).toBeTruthy();
    expect(view.getAllByText("Sign in").length).toBeGreaterThan(0);
  });

  it("shows the signed-in account on Settings", async () => {
    readAccessToken.mockResolvedValue("token");
    loadMe.mockResolvedValue({ ok: true, data: signedInUser });

    const view = await renderCustomerTabs("/settings");

    expect(await view.findByText("ada@example.com")).toBeTruthy();
    expect(view.getByTestId("settings-signed-in")).toBeTruthy();
    expect(view.getByText("Sign out")).toBeTruthy();
    expect(view.getByText("active")).toBeTruthy();
    await waitFor(() => {
      expect(view.queryByText("Sign in")).toBeNull();
    });
  });

  it("keeps the signed-in account visible when a later refresh fails", async () => {
    fetchAuthConfig
      .mockResolvedValueOnce({ password: true, google: false, facebook: false })
      .mockRejectedValueOnce(new Error("network down"));
    readAccessToken.mockResolvedValue("token");
    loadMe.mockResolvedValue({ ok: true, data: signedInUser });

    const view = await renderCustomerTabs("/settings");

    expect(await view.findByText("ada@example.com")).toBeTruthy();

    await i18n.changeLanguage("pl");

    expect(await view.findByText("network down")).toBeTruthy();
    expect(view.getByText("ada@example.com")).toBeTruthy();
    expect(view.getByText("Wyloguj")).toBeTruthy();
  });
});
