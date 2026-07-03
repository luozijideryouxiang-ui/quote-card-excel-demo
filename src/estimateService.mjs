export function resolvePriceForLine(line, priceEntries = []) {
  const entry = priceEntries.find((item) => item.productId === line.productId);
  if (!entry) return 0;
  const providerPrice = chooseProviderPrice(entry, line);
  if (providerPrice !== null) return providerPrice;
  const annual = nullableNumber(entry.price?.annual);
  const standard = nullableNumber(entry.price?.standard);
  if (line.isAnnualFrame && annual !== null) return annual;
  return standard ?? 0;
}

export function calculateQuoteTotals({ lines = [], priceEntries = [], taxRate = 0.06 }) {
  const taxExclusiveTotal = lines.reduce((sum, line) => {
    const unitPrice = resolvePriceForLine(line, priceEntries);
    const liveUnits = numberOrDefault(line.quantity, 0) * numberOrDefault(line.days, 0);
    const rehearsalUnits =
      numberOrDefault(line.rehearsalQuantity, 0) * numberOrDefault(line.rehearsalDays, 0);
    return sum + unitPrice * (liveUnits + rehearsalUnits);
  }, 0);
  const normalizedTaxRate = numberOrDefault(taxRate, 0);
  const taxAmount = roundCurrency(taxExclusiveTotal * normalizedTaxRate);
  return {
    taxExclusiveTotal: roundCurrency(taxExclusiveTotal),
    taxRate: normalizedTaxRate,
    taxAmount,
    taxInclusiveTotal: roundCurrency(taxExclusiveTotal + taxAmount),
  };
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function chooseProviderPrice(entry, line) {
  const provider = normalizeProviderName(line.provider);
  if (!provider) return null;
  const option = (Array.isArray(entry.providerPrices) ? entry.providerPrices : []).find(
    (item) => normalizeProviderName(item.provider) === provider,
  );
  if (!option) return null;
  const annual = nullableNumber(option.annual);
  const standard = nullableNumber(option.standard);
  if (line.isAnnualFrame && annual !== null) return annual;
  return standard ?? annual;
}

function normalizeProviderName(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
