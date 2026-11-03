import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, renderRouter } from "expo-router/testing-library";

import CardRoute from "../../app/card/[id]";
import RootLayout from "../../app/_layout";
import CustomerTabs from "../../app/(tabs)/_layout";
import CardsRoute from "../../app/(tabs)/index";
import SettingsRoute from "../../app/(tabs)/settings";
import StampRoute from "../../app/(tabs)/stamp";
import { api } from "../api";
import i18n from "../i18n";
import { getAccessToken } from "../session";
import { addCard } from "./loyaltyCards";

jest.mock("../api", () => ({
  api: {
    fetchAuthConfig: jest.fn(),
    loadMe: jest.fn(),
  },
}));

jest.mock("../session", () => ({
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
  clearAccessToken: jest.fn(),
  getSavedLanguage: jest.fn(async () => null),
  setSavedLanguage: jest.fn(),
}));

const fetchAuthConfig = api.fetchAuthConfig as jest.Mock;
const loadMe = api.loadMe as jest.Mock;
const readAccessToken = getAccessToken as jest.Mock;

function customerRoutes() {
  return {
    _layout: RootLayout,
    "(tabs)/_layout": CustomerTabs,
    "(tabs)/index": CardsRoute,
    "(tabs)/stamp": StampRoute,
    "(tabs)/settings": SettingsRoute,
    "card/[id]": CardRoute,
  };
}

async function renderCustomerRoutes(initialUrl: string) {
  const pending = renderRouter(customerRoutes(), { initialUrl });
  jest.useRealTimers();
  return await pending;
}

describe("loyalty cards on device", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
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

  it("lists, opens, and deletes a card while signed out", async () => {
    const card = await addCard({
      name: "Corner Cafe",
      symbology: "qr",
      payload: "cafe-1",
      places: [
        {
          id: "place-market",
          latitude: 52.23,
          longitude: 21.01,
          usedAt: "2026-04-02T15:30:00.000Z",
          label: "Market",
        },
        {
          id: "place-branch",
          latitude: 50.06,
          longitude: 19.94,
          usedAt: "2026-05-01T08:00:00.000Z",
          label: null,
        },
      ],
    });

    const view = await renderCustomerRoutes("/");

    fireEvent.press(await view.findByTestId(`card-row-${card.id}`));

    expect(await view.findByTestId("card-detail")).toBeTruthy();
    expect(view.getByTestId("card-symbology").props.children).toBe("qr");
    expect(view.getByTestId("card-payload").props.children).toBe("cafe-1");
    expect(view.getByText("Market")).toBeTruthy();
    expect(view.getByText("Used here")).toBeTruthy();
    expect(view.getByText("2026-04-02 15:30")).toBeTruthy();
    expect(view.getByText("2026-05-01 08:00")).toBeTruthy();

    fireEvent.press(view.getByTestId("card-delete"));

    expect(await view.findByTestId("cards-empty")).toBeTruthy();
    expect(view.getByText("No loyalty cards yet.")).toBeTruthy();
    expect(view.queryByTestId(`card-row-${card.id}`)).toBeNull();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });

  it("shows a missing card without calling the API", async () => {
    const view = await renderCustomerRoutes("/card/missing");

    expect(await view.findByTestId("card-missing")).toBeTruthy();
    expect(view.getByText("This card is no longer on this device.")).toBeTruthy();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();

    fireEvent.press(view.getByTestId("card-back"));

    expect(await view.findByTestId("cards-empty")).toBeTruthy();
  });

  it("returns to the card list after deleting a directly opened card", async () => {
    const card = await addCard({
      name: "Corner Cafe",
      symbology: "qr",
      payload: "cafe-1",
    });
    const view = await renderCustomerRoutes(`/card/${card.id}`);

    expect(await view.findByTestId("card-payload")).toBeTruthy();
    fireEvent.press(view.getByTestId("card-delete"));

    expect(await view.findByTestId("cards-empty")).toBeTruthy();
    expect(view.queryByTestId(`card-row-${card.id}`)).toBeNull();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
  });
});
