import bwipjs from "bwip-js/browser";

const BARCODE_IDS = {
  qr: "qrcode",
  code128: "code128",
  ean13: "ean13",
} as const;

type StoredSymbology = keyof typeof BARCODE_IDS;

export type RenderedCardCode = { ok: true; svg: string } | { ok: false };

export function renderCardCode(symbology: string, payload: string): RenderedCardCode {
  if (!isStoredSymbology(symbology)) {
    return { ok: false };
  }
  const text = symbology === "ean13" ? normalizeEan13(payload) : payload;
  if (text === null || text.length === 0) {
    return { ok: false };
  }
  try {
    const svg = bwipjs.toSVG(renderOptions(symbology, text));
    if (!svg.startsWith("<svg")) {
      return { ok: false };
    }
    return { ok: true, svg };
  } catch {
    return { ok: false };
  }
}

function isStoredSymbology(value: string): value is StoredSymbology {
  return value === "qr" || value === "code128" || value === "ean13";
}

function normalizeEan13(payload: string): string | null {
  if (!/^\d{12}$|^\d{13}$/.test(payload)) {
    return null;
  }
  const body = payload.slice(0, 12);
  const check = ean13CheckDigit(body);
  if (payload.length === 13 && payload[12] !== check) {
    return null;
  }
  return `${body}${check}`;
}

function ean13CheckDigit(digits: string): string {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits.charCodeAt(index) - 48;
    sum += index % 2 === 0 ? digit : digit * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

function renderOptions(symbology: StoredSymbology, text: string): bwipjs.RenderOptions {
  return {
    bcid: BARCODE_IDS[symbology],
    text,
    scale: 3,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
    paddingwidth: 8,
    paddingheight: 8,
    ...(symbology === "qr" ? {} : { height: 12, includetext: true, textcolor: "000000" }),
  };
}
