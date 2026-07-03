export const DEFAULT_PRICE_PASSWORD = "rmm2026";

export function isPricePasswordValid(value, expected = process.env.PRICE_FEATURE_PASSWORD || DEFAULT_PRICE_PASSWORD) {
  return String(value || "") === String(expected || "");
}

export function readPricePassword(req, body = {}) {
  return req.headers["x-price-password"] || body.pricePassword || body.password || "";
}
