import { CATEGORY_BLOCKS, SECTIONS } from "./templateConfig.mjs";

const SECTION_LABELS = {
  equipment: "设备",
  personnel: "人员",
  reimbursement: "实报实销",
};

export function createQuoteLine(product, options = {}) {
  return normalizeQuoteLine({
    lineId: options.lineId || createLineId(product.id),
    productId: product.id,
    type: product.type,
    category: product.category,
    name: product.name,
    model: options.model ?? product.model ?? "",
    quantity: options.quantity ?? 1,
    days: options.days ?? 1,
    rehearsalQuantity: options.rehearsalQuantity ?? 0,
    rehearsalDays: options.rehearsalDays ?? 0,
    remark: options.remark ?? "",
    provider: options.provider ?? product.provider ?? "",
    isAnnualFrame: options.isAnnualFrame ?? Boolean(product.isAnnualFrame),
    source: options.source || "catalog",
  });
}

export function createCustomQuoteLine(options = {}) {
  return normalizeQuoteLine({
    lineId: options.lineId || createLineId("custom"),
    productId: "",
    type: options.type || "equipment",
    category: options.category || "其他",
    name: options.name || "自定义项目",
    model: options.model || "",
    quantity: options.quantity ?? 1,
    days: options.days ?? 1,
    rehearsalQuantity: options.rehearsalQuantity ?? 0,
    rehearsalDays: options.rehearsalDays ?? 0,
    remark: options.remark || "",
    provider: options.provider || "",
    isAnnualFrame: Boolean(options.isAnnualFrame),
    source: "custom",
  });
}

export function expandPackage(packageConfig, catalog) {
  const catalogById = new Map(catalog.map((product) => [product.id, product]));
  return packageConfig.items.flatMap((item) => {
    const product = catalogById.get(item.productId);
    if (!product) return [];
    return [
      createQuoteLine(product, {
        quantity: item.quantity ?? 1,
        days: item.days ?? 1,
        rehearsalQuantity: item.rehearsalQuantity ?? 0,
        rehearsalDays: item.rehearsalDays ?? 0,
        remark: item.remark || "",
        source: "package",
      }),
    ];
  });
}

export function normalizeQuoteLines(lines) {
  const normalized = lines.map((line) => normalizeQuoteLine(line));
  validateTemplateCapacity(normalized);
  return normalized;
}

export function normalizeQuoteLine(line) {
  return {
    lineId: String(line.lineId || createLineId(line.productId || line.name || "line")),
    productId: String(line.productId || ""),
    type: normalizeType(line.type),
    category: String(line.category || ""),
    name: String(line.name || ""),
    model: String(line.model || ""),
    quantity: numberOrDefault(line.quantity, 1),
    days: numberOrDefault(line.days, 1),
    rehearsalQuantity: numberOrDefault(line.rehearsalQuantity, 0),
    rehearsalDays: numberOrDefault(line.rehearsalDays, 0),
    remark: String(line.remark || ""),
    provider: String(line.provider || ""),
    isAnnualFrame: Boolean(line.isAnnualFrame),
    source: normalizeSource(line.source),
  };
}

export function applyPriceBook(lines, priceBook = {}) {
  return lines.map((line) => {
    const price = priceBook[line.productId];
    if (price === undefined || price === null || price === "") return { ...line };
    return { ...line, unitPrice: Number(price) || 0 };
  });
}

export function validateTemplateCapacity(lines) {
  for (const [type, section] of Object.entries(SECTIONS)) {
    const count = lines.filter((line) => line.type === type).length;
    const capacity = section.end - section.start + 1;
    if (count > capacity) {
      throw new Error(`${SECTION_LABELS[type]}超出模板容量：最多 ${capacity} 行，当前 ${count} 行`);
    }
  }

  for (const [type, blocks] of Object.entries(CATEGORY_BLOCKS)) {
    for (const block of blocks) {
      const count = lines.filter((line) => line.type === type && line.category === block.category).length;
      const capacity = block.end - block.start + 1;
      if (count > capacity) {
        throw new Error(`${block.category}超出模板容量：最多 ${capacity} 行，当前 ${count} 行`);
      }
    }
  }
}

function createLineId(seed) {
  const random = Math.random().toString(36).slice(2, 8);
  return `line_${String(seed || "item").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24)}_${random}`;
}

function normalizeType(type) {
  if (["equipment", "personnel", "reimbursement"].includes(type)) return type;
  return "equipment";
}

function normalizeSource(source) {
  if (["catalog", "package", "import", "custom"].includes(source)) return source;
  return "custom";
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
