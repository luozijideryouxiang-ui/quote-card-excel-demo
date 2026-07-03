import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAnnualVendorRowsFromValues,
  importPriceText,
  loadPriceEntries,
  priceEntriesToRenderBook,
  updatePriceEntry,
} from "../src/priceService.mjs";

const catalog = [
  {
    id: "product_sony_ilme_fx3",
    name: "Sony ILME-FX3",
    type: "equipment",
    category: "摄像设备",
    isAnnualFrame: true,
  },
  {
    id: "product_atem",
    name: "ATEM",
    type: "equipment",
    category: "导播设备",
    isAnnualFrame: false,
  },
];

test("importPriceText parses standard and annual prices and persists them", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-price-service-"));

  const result = await importPriceText({
    text: "FX3    1200    800\nATEM   900     600",
    catalog,
    dataDir,
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  assert.equal(result.matched.length, 2);
  assert.deepEqual(result.entries[0], {
    productId: "product_sony_ilme_fx3",
    price: {
      standard: 1200,
      annual: 800,
    },
    providerPrices: [],
    updatedAt: "2026-07-03",
  });

  const saved = await loadPriceEntries({ dataDir });
  assert.equal(saved.length, 2);
  assert.equal(saved.find((entry) => entry.productId === "product_atem").price.annual, 600);
});

test("updatePriceEntry changes one product and render book chooses annual price for annual-frame lines", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-price-update-"));

  await updatePriceEntry({
    dataDir,
    entry: {
      productId: "product_sony_ilme_fx3",
      price: { standard: 1300, annual: 850 },
    },
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  const renderBook = await priceEntriesToRenderBook({
    dataDir,
    lines: [
      { productId: "product_sony_ilme_fx3", isAnnualFrame: true },
      { productId: "product_atem", isAnnualFrame: false },
    ],
  });

  assert.deepEqual(renderBook, {
    product_sony_ilme_fx3: 850,
  });
});

test("priceEntriesToRenderBook falls back to standard price when annual price is blank", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-price-fallback-"));

  await updatePriceEntry({
    dataDir,
    entry: {
      productId: "product_sony_ilme_fx3",
      price: { standard: 1300, annual: null },
    },
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  const renderBook = await priceEntriesToRenderBook({
    dataDir,
    lines: [{ productId: "product_sony_ilme_fx3", isAnnualFrame: true }],
  });

  assert.equal(renderBook.product_sony_ilme_fx3, 1300);
});

test("extractAnnualVendorRowsFromValues reads annual-frame vendor columns", () => {
  const rows = extractAnnualVendorRowsFromValues([
    ["", "项目内容", "设备型号", "常用场次", "欢屹0714", "励影0714", "茉谷0714"],
    ["", "Sony ILME-FX3", "", "大", 200, 300, 500],
    ["", "ATEM", "", "中", 800, "", 900],
  ]);

  assert.deepEqual(rows, [
    {
      name: "Sony ILME-FX3",
      providerPrices: [
        { provider: "欢屹", annual: 200, standard: null },
        { provider: "励影", annual: 300, standard: null },
        { provider: "茉谷", annual: 500, standard: null },
      ],
    },
    {
      name: "ATEM",
      providerPrices: [
        { provider: "欢屹", annual: 800, standard: null },
        { provider: "茉谷", annual: 900, standard: null },
      ],
    },
  ]);
});

test("updatePriceEntry preserves provider options and render book can choose a provider", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-price-provider-"));

  await updatePriceEntry({
    dataDir,
    entry: {
      productId: "product_sony_ilme_fx3",
      price: { standard: 1200, annual: 200 },
      providerPrices: [
        { provider: "欢屹", annual: 200, standard: null },
        { provider: "励影", annual: 300, standard: null },
      ],
    },
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  await updatePriceEntry({
    dataDir,
    entry: {
      productId: "product_sony_ilme_fx3",
      price: { standard: 1300, annual: 250 },
    },
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  const saved = await loadPriceEntries({ dataDir });
  assert.equal(saved[0].providerPrices.length, 2);

  const renderBook = await priceEntriesToRenderBook({
    dataDir,
    lines: [{ productId: "product_sony_ilme_fx3", isAnnualFrame: true, provider: "励影" }],
  });

  assert.equal(renderBook.product_sony_ilme_fx3, 300);
});
