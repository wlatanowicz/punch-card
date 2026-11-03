import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LoyaltyCardPlace } from "./loyaltyCard";
import { addCard, deleteCard, getCard, listCards } from "./loyaltyCards";

const market: LoyaltyCardPlace = {
  id: "place-market",
  latitude: 52.23,
  longitude: 21.01,
  usedAt: "2026-04-02T15:30:00.000Z",
  label: "Market",
};

const unlabeled: LoyaltyCardPlace = {
  id: "place-unlabeled",
  latitude: 50.06,
  longitude: 19.94,
  usedAt: "2026-05-01T08:00:00.000Z",
  label: null,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("loyalty card store", () => {
  it("adds, lists, and deletes cards", async () => {
    const timestamps = ["2026-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z"];
    let timestampIndex = 0;
    jest.spyOn(Date.prototype, "toISOString").mockImplementation(() => {
      const value = timestamps[Math.min(timestampIndex, timestamps.length - 1)];
      timestampIndex += 1;
      return value;
    });

    const cafe = await addCard({
      name: "Corner Cafe",
      symbology: "qr",
      payload: "cafe-1",
      places: [market, unlabeled],
    });
    const grocer = await addCard({
      name: "Grocer",
      symbology: "ean13",
      payload: "5901234123457",
    });

    expect(cafe.places).toEqual([market, unlabeled]);
    expect(grocer.places).toEqual([]);

    const listed = await listCards();
    expect(listed.map((card) => card.name)).toEqual(["Grocer", "Corner Cafe"]);
    expect(listed[1].places).toEqual([market, unlabeled]);
    expect(await getCard(cafe.id)).toEqual(cafe);

    await deleteCard(cafe.id);

    await expect(listCards()).resolves.toEqual([grocer]);
    await expect(getCard(cafe.id)).resolves.toBeNull();
    jest.restoreAllMocks();
  });

  it("reloads saved cards after the module is imported again", async () => {
    const created = await addCard({
      name: "Corner Cafe",
      symbology: "code128",
      payload: "ABC",
      places: [unlabeled],
    });

    jest.resetModules();
    const reloaded = require("./loyaltyCards") as typeof import("./loyaltyCards");

    await expect(reloaded.listCards()).resolves.toEqual([created]);
    await expect(reloaded.getCard(created.id)).resolves.toEqual(created);
  });

  it("treats unreadable storage as an empty list", async () => {
    await AsyncStorage.setItem("loyalty_cards", "{");
    await expect(listCards()).resolves.toEqual([]);

    await AsyncStorage.setItem("loyalty_cards", JSON.stringify({ nope: true }));
    await expect(listCards()).resolves.toEqual([]);
  });
});
