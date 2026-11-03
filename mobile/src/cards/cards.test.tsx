import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, renderRouter } from "expo-router/testing-library";

import CardRoute from "../../app/card/[id]";
import RootLayout from "../../app/_layout";
import CustomerTabs from "../../app/(tabs)/_layout";
import CardsRoute from "../../app/(tabs)/index";
import SettingsRoute from "../../app/(tabs)/settings";
import StampRoute from "../../app/(tabs)/stamp";
import ScanRoute from "../../app/scan";
import { api } from "../api";
import i18n from "../i18n";
import { getAccessToken } from "../session";
import { addCard, listCards } from "./loyaltyCards";

type CameraPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  status: "granted" | "denied" | "undetermined";
  expires: "never";
};

type CameraHarness = {
  permission: CameraPermissionState | null;
  requestPermission: jest.Mock;
  onBarcodeScanned?: (result: { type: string; data: string }) => void;
};

function cameraHarness(): CameraHarness {
  return (globalThis as unknown as { __cameraHarness: CameraHarness }).__cameraHarness;
}

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  const harness: CameraHarness = {
    permission: {
      granted: false,
      canAskAgain: false,
      status: "denied",
      expires: "never",
    },
    requestPermission: jest.fn(async () => harness.permission),
  };
  (globalThis as unknown as { __cameraHarness?: CameraHarness }).__cameraHarness = harness;
  return {
    CameraView: (props: { onBarcodeScanned?: CameraHarness["onBarcodeScanned"] }) => {
      harness.onBarcodeScanned = props.onBarcodeScanned;
      return React.createElement(View, null);
    },
    useCameraPermissions: () => [harness.permission, harness.requestPermission],
  };
});

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
    scan: ScanRoute,
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
    cameraHarness().permission = {
      granted: false,
      canAskAgain: false,
      status: "denied",
      expires: "never",
    };
    cameraHarness().requestPermission.mockClear();
    cameraHarness().onBarcodeScanned = undefined;
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
    expect(view.getByText("Corner Cafe")).toBeTruthy();
    expect(view.getByTestId("card-code").props.accessible).toBe(true);
    expect(view.getByTestId("card-code").props.accessibilityLabel).toBe("cafe-1");
    expect(view.queryByTestId("card-payload")).toBeNull();
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

  it("shows the payload when the symbology cannot be rendered", async () => {
    const card = await addCard({
      name: "Old Shop",
      symbology: "pdf417",
      payload: "typed-by-hand",
    });
    const view = await renderCustomerRoutes(`/card/${card.id}`);

    expect(await view.findByTestId("card-code-error")).toBeTruthy();
    expect(view.getByText("This code cannot be displayed.")).toBeTruthy();
    expect(view.getByText("Old Shop")).toBeTruthy();
    expect(view.getByTestId("card-payload").props.children).toBe("typed-by-hand");
    expect(view.queryByTestId("card-code")).toBeNull();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
  });

  it("returns to the card list after deleting a directly opened card", async () => {
    const card = await addCard({
      name: "Corner Cafe",
      symbology: "qr",
      payload: "cafe-1",
    });
    const view = await renderCustomerRoutes(`/card/${card.id}`);

    expect(await view.findByTestId("card-code")).toBeTruthy();
    fireEvent.press(view.getByTestId("card-delete"));

    expect(await view.findByTestId("cards-empty")).toBeTruthy();
    expect(view.queryByTestId(`card-row-${card.id}`)).toBeNull();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
  });

  it("returns to the list when camera permission is denied", async () => {
    const view = await renderCustomerRoutes("/");

    fireEvent.press(view.getByTestId("cards-scan"));

    expect(await view.findByTestId("scan-permission-denied")).toBeTruthy();
    expect(
      view.getByText("Camera access is off. Punch Card needs the camera to read a loyalty card."),
    ).toBeTruthy();

    fireEvent.press(view.getByTestId("scan-back"));

    expect(await view.findByTestId("cards-screen")).toBeTruthy();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });

  it("asks for camera access when it can still be requested", async () => {
    cameraHarness().permission = {
      granted: false,
      canAskAgain: true,
      status: "undetermined",
      expires: "never",
    };
    const view = await renderCustomerRoutes("/");

    fireEvent.press(view.getByTestId("cards-scan"));

    expect(await view.findByTestId("scan-allow")).toBeTruthy();
    expect(view.queryByTestId("scan-permission-denied")).toBeNull();
    fireEvent.press(view.getByTestId("scan-allow"));
    expect(cameraHarness().requestPermission).toHaveBeenCalled();
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });

  it("saves the first scanned code after the card is named", async () => {
    cameraHarness().permission = {
      granted: true,
      canAskAgain: false,
      status: "granted",
      expires: "never",
    };
    const view = await renderCustomerRoutes("/");

    fireEvent.press(view.getByTestId("cards-scan"));
    expect(await view.findByTestId("scan-camera")).toBeTruthy();

    await act(async () => {
      cameraHarness().onBarcodeScanned?.({ type: "pdf417", data: "ignore-me" });
      cameraHarness().onBarcodeScanned?.({ type: "ean13", data: "" });
    });
    expect(view.queryByTestId("scan-name")).toBeNull();

    await act(async () => {
      cameraHarness().onBarcodeScanned?.({ type: "ean13", data: "1234567890128" });
      cameraHarness().onBarcodeScanned?.({ type: "qr", data: "https://example.com/second" });
    });

    await fireEvent.changeText(await view.findByTestId("scan-name"), "Grocery");
    await fireEvent.press(view.getByTestId("scan-save"));

    expect(await view.findByText("Grocery")).toBeTruthy();
    expect(await listCards()).toEqual([
      expect.objectContaining({
        name: "Grocery",
        symbology: "ean13",
        payload: "1234567890128",
      }),
    ]);
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });

  it("saves a scanned QR code with its raw payload", async () => {
    cameraHarness().permission = {
      granted: true,
      canAskAgain: false,
      status: "granted",
      expires: "never",
    };
    const view = await renderCustomerRoutes("/");

    fireEvent.press(view.getByTestId("cards-scan"));
    expect(await view.findByTestId("scan-camera")).toBeTruthy();
    await act(async () => {
      cameraHarness().onBarcodeScanned?.({ type: "qr", data: "https://example.com/card?id=1" });
    });

    await fireEvent.changeText(await view.findByTestId("scan-name"), "Corner Cafe");
    await fireEvent.press(view.getByTestId("scan-save"));

    expect(await view.findByText("Corner Cafe")).toBeTruthy();
    expect(await listCards()).toEqual([
      expect.objectContaining({
        name: "Corner Cafe",
        symbology: "qr",
        payload: "https://example.com/card?id=1",
      }),
    ]);
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });

  it("does not save a blank card name and can return to the scanner", async () => {
    cameraHarness().permission = {
      granted: true,
      canAskAgain: false,
      status: "granted",
      expires: "never",
    };
    const view = await renderCustomerRoutes("/");

    await fireEvent.press(view.getByTestId("cards-scan"));
    expect(await view.findByTestId("scan-camera")).toBeTruthy();
    await act(async () => {
      cameraHarness().onBarcodeScanned?.({ type: "code128", data: "STORE-1" });
    });

    expect((await view.findByTestId("scan-save")).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId("scan-save"));
    await fireEvent.changeText(view.getByTestId("scan-name"), "   ");
    expect(view.getByTestId("scan-save").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId("scan-save"));
    expect(await listCards()).toEqual([]);

    await fireEvent.press(view.getByTestId("scan-back"));

    expect(await view.findByTestId("scan-camera")).toBeTruthy();
    expect(view.queryByTestId("scan-name")).toBeNull();
    expect(await listCards()).toEqual([]);
    expect(fetchAuthConfig).not.toHaveBeenCalled();
    expect(loadMe).not.toHaveBeenCalled();
    expect(readAccessToken).not.toHaveBeenCalled();
  });
});
