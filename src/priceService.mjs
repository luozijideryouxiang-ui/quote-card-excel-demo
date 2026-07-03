import { SpreadsheetFile } from "@oai/artifact-tool";
import { matchProduct } from "./catalogExtractor.mjs";
import { formatLocalDate, readJsonFile, resolveSettingsPath, writeJsonFile } from "./settingsService.mjs";

const PRICE_FILE = "prices.json";

export async function loadPriceEntries({ dataDir }) {
  return normalizeEntries(await readJsonFile(resolveSettingsPath(dataDir, PRICE_FILE), []));
}

export async function savePriceEntries({ dataDir, entries }) {
  const normalized = normalizeEntries(entries);
  await writeJsonFile(resolveSettingsPath(dataDir, PRICE_FILE), normalized);
  return normalized;
}

export async function importPriceText({ text, catalog, dataDir, now = new Date() }) {
  const existing = await loadPriceEntries({ dataDir });
  const byProductId = new Map(existing.map((entry) => [entry.productId, entry]));
  const matched = [];
  const unmatched = [];

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parsePriceLine(line);
    if (!parsed) {
      unmatched.push({ raw: line, reason: "无法识别价格" });
      continue;
    }

    const match = matchProduct(parsed.name, catalog);
    if (!match) {
      unmatched.push({ raw: line, name: parsed.name, reason: "未匹配产品" });
      continue;
    }

    const entry = normalizeEntry({
      productId: match.product.id,
      price: {
        standard: parsed.standard,
        annual: parsed.annual,
      },
      updatedAt: formatLocalDate(now),
    });
    byProductId.set(entry.productId, entry);
    matched.push({
      productId: entry.productId,
      name: match.product.name,
      price: entry.price,
      confidence: match.confidence,
      raw: line,
    });
  }

  const entries = await savePriceEntries({ dataDir, entries: [...byProductId.values()] });
  return { entries, matched, unmatched };
}

export async function importPriceWorkbook({ input, catalog, dataDir, now = new Date() }) {
  const workbook = await SpreadsheetFile.importXlsx(input);
  const annualResult = await importAnnualVendorWorkbook({ workbook, catalog, dataDir, now });
  if (annualResult.matched.length || annualResult.unmatched.length) return annualResult;

  const sheet = workbook.worksheets.getItemAt(0);
  const values = sheet.getRange("A1:C300").values;
  const text = values
    .filter(([name, standard]) => name && standard !== null && standard !== undefined && standard !== "")
    .map(([name, standard, annual]) => [name, standard, annual].filter((value) => value !== null && value !== undefined && value !== "").join("\t"))
    .join("\n");
  return await importPriceText({ text, catalog, dataDir, now });
}

export async function updatePriceEntry({ dataDir, entry, now = new Date() }) {
  const existing = await loadPriceEntries({ dataDir });
  const byProductId = new Map(existing.map((item) => [item.productId, item]));
  const previous = byProductId.get(String(entry.productId || ""));
  const normalized = normalizeEntry({
    ...(previous || {}),
    ...entry,
    providerPrices: entry.providerPrices === undefined ? previous?.providerPrices : entry.providerPrices,
    updatedAt: entry.updatedAt || formatLocalDate(now),
  });
  byProductId.set(normalized.productId, normalized);
  const entries = await savePriceEntries({ dataDir, entries: [...byProductId.values()] });
  return {
    entry: normalized,
    entries,
  };
}

export async function priceEntriesToRenderBook({ dataDir, lines }) {
  const entries = await loadPriceEntries({ dataDir });
  const byProductId = new Map(entries.map((entry) => [entry.productId, entry]));
  const priceBook = {};

  for (const line of lines || []) {
    const entry = byProductId.get(line.productId);
    if (!entry) continue;
    const annualPrice = nullableNumber(entry.price.annual);
    const standardPrice = nullableNumber(entry.price.standard);
    const providerPrice = chooseProviderPrice(entry, line);
    const chosen = providerPrice ?? (line.isAnnualFrame && annualPrice !== null ? annualPrice : standardPrice);
    if (Number.isFinite(chosen)) priceBook[line.productId] = chosen;
  }

  return priceBook;
}

export async function importAnnualVendorWorkbook({ workbook, catalog, dataDir, now = new Date() }) {
  const sheet = findWorksheet(workbook, "年框价");
  if (!sheet) return { entries: await loadPriceEntries({ dataDir }), matched: [], unmatched: [] };

  const values = sheet.getRange("A1:J500").values;
  const rows = extractAnnualVendorRowsFromValues(values);
  if (!rows.length) return { entries: await loadPriceEntries({ dataDir }), matched: [], unmatched: [] };

  const existing = await loadPriceEntries({ dataDir });
  const byProductId = new Map(existing.map((entry) => [entry.productId, entry]));
  const matched = [];
  const unmatched = [];

  for (const row of rows) {
    const match = matchProduct(row.name, catalog);
    if (!match) {
      unmatched.push({ name: row.name, reason: "未匹配产品", providerPrices: row.providerPrices });
      continue;
    }

    const previous = byProductId.get(match.product.id);
    const firstAnnual = row.providerPrices.map((item) => item.annual).find((value) => nullableNumber(value) !== null);
    const normalized = normalizeEntry({
      ...(previous || {}),
      productId: match.product.id,
      price: {
        standard: previous?.price?.standard ?? null,
        annual: nullableNumber(previous?.price?.annual) ?? firstAnnual ?? null,
      },
      providerPrices: mergeProviderPrices(previous?.providerPrices || [], row.providerPrices),
      updatedAt: formatLocalDate(now),
    });
    byProductId.set(normalized.productId, normalized);
    matched.push({
      productId: normalized.productId,
      name: match.product.name,
      price: normalized.price,
      providerPrices: normalized.providerPrices,
      confidence: match.confidence,
      raw: row.name,
    });
  }

  const entries = await savePriceEntries({ dataDir, entries: [...byProductId.values()] });
  return { entries, matched, unmatched };
}

export function extractAnnualVendorRowsFromValues(values) {
  const rows = Array.isArray(values) ? values : [];
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell || "").includes("项目内容")));
  if (headerIndex < 0) return [];

  const header = rows[headerIndex];
  const nameIndex = header.findIndex((cell) => String(cell || "").includes("项目内容"));
  const providerColumns = header
    .map((cell, index) => ({ provider: normalizeProviderName(cell), index }))
    .filter(({ provider, index }) => provider && index !== nameIndex);

  return rows
    .slice(headerIndex + 1)
    .map((row) => {
      const name = String(row[nameIndex] || "").trim();
      if (!name) return null;
      const providerPrices = providerColumns
        .map(({ provider, index }) => ({
          provider,
          annual: numberOrNull(row[index]),
          standard: null,
        }))
        .filter((item) => item.annual !== null);
      if (!providerPrices.length) return null;
      return { name, providerPrices };
    })
    .filter(Boolean);
}

export function parsePriceLine(line) {
  const tokens = String(line || "")
    .trim()
    .split(/[\s,，:：\t]+/)
    .filter(Boolean);
  if (tokens.length < 2) return null;

  const annual = parseNumberToken(tokens.at(-1));
  const standard = parseNumberToken(tokens.at(-2));

  if (standard !== null && annual !== null && tokens.length >= 3) {
    return {
      name: tokens.slice(0, -2).join(" "),
      standard,
      annual,
    };
  }

  const single = parseNumberToken(tokens.at(-1));
  if (single === null) return null;
  return {
    name: tokens.slice(0, -1).join(" "),
    standard: single,
    annual: single,
  };
}

function normalizeEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => normalizeEntry(entry));
}

function normalizeEntry(entry) {
  return {
    productId: String(entry.productId || ""),
    price: {
      standard: numberOrNull(entry.price?.standard),
      annual: numberOrNull(entry.price?.annual),
    },
    providerPrices: normalizeProviderPrices(entry.providerPrices),
    updatedAt: String(entry.updatedAt || formatLocalDate()),
  };
}

function normalizeProviderPrices(providerPrices) {
  return (Array.isArray(providerPrices) ? providerPrices : [])
    .map((item) => ({
      provider: normalizeProviderName(item.provider),
      standard: numberOrNull(item.standard),
      annual: numberOrNull(item.annual),
    }))
    .filter((item) => item.provider && (item.standard !== null || item.annual !== null));
}

function mergeProviderPrices(previous, next) {
  const byProvider = new Map();
  for (const item of normalizeProviderPrices(previous)) byProvider.set(item.provider, item);
  for (const item of normalizeProviderPrices(next)) byProvider.set(item.provider, item);
  return [...byProvider.values()];
}

function chooseProviderPrice(entry, line) {
  const provider = normalizeProviderName(line.provider);
  if (!provider) return null;
  const option = normalizeProviderPrices(entry.providerPrices).find((item) => normalizeProviderName(item.provider) === provider);
  if (!option) return null;
  const annual = nullableNumber(option.annual);
  const standard = nullableNumber(option.standard);
  return line.isAnnualFrame && annual !== null ? annual : standard ?? annual;
}

function findWorksheet(workbook, name) {
  try {
    return workbook.worksheets.getItem(name);
  } catch {
    return null;
  }
}

function normalizeProviderName(value) {
  return String(value || "")
    .trim()
    .replace(/\d{3,}$/g, "")
    .replace(/\s+/g, "");
}

function parseNumberToken(value) {
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(String(value || ""))) return null;
  return Number(value);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
