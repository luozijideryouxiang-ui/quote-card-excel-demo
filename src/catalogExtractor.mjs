import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { DEFAULT_TEMPLATE_PATH, typeForCategory } from "./templateConfig.mjs";

const CATALOG_SHEET_NAME = "年框+自有设备清单";
const CATALOG_RANGE = "A3:C170";

export async function loadCatalogFromTemplate(templatePath = DEFAULT_TEMPLATE_PATH) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
  return extractCatalogFromWorkbook(workbook);
}

export function extractCatalogFromWorkbook(workbook) {
  const sheet = workbook.worksheets.getItem(CATALOG_SHEET_NAME);
  const values = sheet.getRange(CATALOG_RANGE).values;
  const products = [];
  let currentCategory = "";

  values.forEach(([categoryCell, name, annual], index) => {
    if (categoryCell) currentCategory = String(categoryCell).trim();
    if (!name || !currentCategory) return;

    const normalizedName = String(name).trim();
    const type = typeForCategory(currentCategory);
    const rowNumber = index + 3;
    products.push({
      id: createProductId(normalizedName),
      type,
      category: currentCategory,
      name: normalizedName,
      model: "",
      isAnnualFrame: String(annual || "").trim() === "是",
      provider: defaultProvider(String(annual || "").trim()),
      aliases: createAliases(normalizedName),
      source: {
        workbook: DEFAULT_TEMPLATE_PATH,
        sheet: CATALOG_SHEET_NAME,
        row: rowNumber,
      },
    });
  });

  return dedupeProducts(products);
}

export function createProductId(name) {
  const ascii = String(name)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (ascii) return `product_${ascii}`.slice(0, 80);

  const hash = hashString(name);
  return `product_${hash}`;
}

export function matchProduct(query, catalog) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const exact = catalog.find((product) => {
    const haystack = [product.name, product.id, ...(product.aliases || [])].map(normalizeSearchText);
    return haystack.includes(normalizedQuery);
  });
  if (exact) return { product: exact, confidence: 1 };

  const contains = catalog.find((product) => {
    const haystack = [product.name, product.id, ...(product.aliases || [])].map(normalizeSearchText);
    return haystack.some(
      (value) =>
        value &&
        (value.includes(normalizedQuery) || normalizedQuery.includes(value)) &&
        Math.min(value.length, normalizedQuery.length) >= 3,
    );
  });
  if (contains) return { product: contains, confidence: 0.75 };

  return null;
}

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[（）()【】\[\]{}]/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createAliases(name) {
  const aliases = new Set([name]);
  const asciiTokens = name.match(/[A-Za-z]+[A-Za-z0-9-]*/g) || [];
  for (const token of asciiTokens) aliases.add(token);
  const fx = name.match(/FX\d+/i);
  if (fx) aliases.add(fx[0].toUpperCase());
  const atem = name.match(/ATEM/i);
  if (atem) aliases.add("ATEM");
  return [...aliases];
}

function defaultProvider(annualValue) {
  return annualValue === "是" ? "RMM" : "供应商";
}

function dedupeProducts(products) {
  const seen = new Map();
  return products.map((product) => {
    const count = seen.get(product.id) || 0;
    seen.set(product.id, count + 1);
    return count ? { ...product, id: `${product.id}_${count + 1}` } : product;
  });
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}
