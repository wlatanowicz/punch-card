import { renderCardCode } from "./cardCode";

const EAN13 = "5901234123457";

describe("renderCardCode", () => {
  it("renders QR, Code 128, and EAN-13", () => {
    const qr = renderCardCode("qr", "cafe-1");
    const code128 = renderCardCode("code128", "ABC-123");
    const ean13 = renderCardCode("ean13", EAN13);
    const ean12 = renderCardCode("ean13", EAN13.slice(0, 12));

    expect(qr.ok).toBe(true);
    expect(code128.ok).toBe(true);
    expect(ean13.ok).toBe(true);
    expect(ean12.ok).toBe(true);
    if (qr.ok && code128.ok && ean13.ok && ean12.ok) {
      expect(qr.svg.startsWith("<svg")).toBe(true);
      expect(code128.svg.startsWith("<svg")).toBe(true);
      expect(ean12.svg).toBe(ean13.svg);
    }
  });

  it("fails closed for an unknown symbology, an empty payload, and a bad EAN-13", () => {
    expect(renderCardCode("pdf417", "cafe-1")).toEqual({ ok: false });
    expect(renderCardCode("qr", "")).toEqual({ ok: false });
    expect(renderCardCode("code128", "")).toEqual({ ok: false });
    expect(renderCardCode("ean13", "")).toEqual({ ok: false });
    expect(renderCardCode("ean13", "5901234123450")).toEqual({ ok: false });
    expect(renderCardCode("ean13", "not-a-barcode")).toEqual({ ok: false });
  });
});
