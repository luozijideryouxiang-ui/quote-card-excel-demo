import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalogFromTemplate } from "../src/catalogExtractor.mjs";

test("loadCatalogFromTemplate builds the product catalog from the V5 workbook sheet", async () => {
  const catalog = await loadCatalogFromTemplate();
  const fx3 = catalog.find((product) => product.name === "Sony ILME-FX3");
  const director = catalog.find((product) => product.name === "导播（4-6）");

  assert.equal(catalog.length >= 150, true);
  assert.equal(fx3.type, "equipment");
  assert.equal(fx3.category, "摄像设备");
  assert.equal(fx3.isAnnualFrame, true);
  assert.equal(fx3.provider, "RMM");
  assert.equal(director.type, "personnel");
  assert.equal(director.category, "导播/导演组");
});
