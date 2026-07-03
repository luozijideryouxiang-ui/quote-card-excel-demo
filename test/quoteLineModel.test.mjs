import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPriceBook,
  createCustomQuoteLine,
  createQuoteLine,
  expandPackage,
  normalizeQuoteLines,
} from "../src/quoteLineModel.mjs";
import { parsePriceText } from "../src/priceBook.mjs";

const catalog = [
  {
    id: "product_sony_ilme_fx3",
    type: "equipment",
    category: "摄像设备",
    name: "Sony ILME-FX3",
    model: "",
    isAnnualFrame: true,
    provider: "RMM",
    aliases: ["FX3"],
  },
  {
    id: "product_atem_constellation_8k",
    type: "equipment",
    category: "导播设备",
    name: "ATEM Constellation 8K（BMD 4M/E 8K切换台）",
    model: "",
    isAnnualFrame: true,
    provider: "RMM",
    aliases: ["ATEM"],
  },
];

test("createQuoteLine creates the unified editable row model", () => {
  const line = createQuoteLine(catalog[0], {
    lineId: "line_1",
    quantity: 2,
    days: 3,
    rehearsalQuantity: 1,
    rehearsalDays: 2,
    remark: "竖拍",
  });

  assert.deepEqual(line, {
    lineId: "line_1",
    productId: "product_sony_ilme_fx3",
    type: "equipment",
    category: "摄像设备",
    name: "Sony ILME-FX3",
    model: "",
    quantity: 2,
    days: 3,
    rehearsalQuantity: 1,
    rehearsalDays: 2,
    remark: "竖拍",
    provider: "RMM",
    isAnnualFrame: true,
    source: "catalog",
  });
});

test("expandPackage expands a package into editable QuoteLine rows", () => {
  const lines = expandPackage(
    {
      packageId: "pkg_basic",
      name: "2机位基础套餐",
      items: [
        { productId: "product_sony_ilme_fx3", quantity: 2, days: 1 },
        { productId: "product_atem_constellation_8k", quantity: 1, days: 1 },
      ],
    },
    catalog,
  );

  assert.equal(lines.length, 2);
  assert.equal(lines[0].source, "package");
  assert.equal(lines[0].quantity, 2);
  assert.equal(lines[0].packageId, undefined);
  assert.equal(lines[1].name, "ATEM Constellation 8K（BMD 4M/E 8K切换台）");
});

test("parsePriceText maps pasted price rows into an external price book", () => {
  const result = parsePriceText("FX3    1200\nATEM   800\n不存在 99", catalog);

  assert.deepEqual(result.priceBook, {
    product_sony_ilme_fx3: 1200,
    product_atem_constellation_8k: 800,
  });
  assert.equal(result.unmatched.length, 1);
});

test("applyPriceBook attaches prices only for rendering without changing QuoteLine identity", () => {
  const lines = [createQuoteLine(catalog[0], { lineId: "line_1" })];
  const priced = applyPriceBook(lines, { product_sony_ilme_fx3: 1200 });

  assert.equal(lines[0].unitPrice, undefined);
  assert.equal(priced[0].unitPrice, 1200);
  assert.equal(priced[0].lineId, "line_1");
});

test("normalizeQuoteLines keeps custom lines editable and validates quantities", () => {
  const custom = createCustomQuoteLine({
    lineId: "custom_1",
    type: "equipment",
    category: "其他",
    name: "临时设备",
    quantity: "2",
    days: "3",
    rehearsalQuantity: "1",
    rehearsalDays: "2",
  });

  assert.deepEqual(normalizeQuoteLines([custom])[0], {
    lineId: "custom_1",
    productId: "",
    type: "equipment",
    category: "其他",
    name: "临时设备",
    model: "",
    quantity: 2,
    days: 3,
    rehearsalQuantity: 1,
    rehearsalDays: 2,
    remark: "",
    provider: "",
    isAnnualFrame: false,
    source: "custom",
  });
});
