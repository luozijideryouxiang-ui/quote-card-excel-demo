import test from "node:test";
import assert from "node:assert/strict";
import { FileBlob } from "@oai/artifact-tool";
import { loadCatalogFromTemplate } from "../src/catalogExtractor.mjs";
import { importQuoteWorkbook } from "../src/importEngine.mjs";
import { DEFAULT_TEMPLATE_PATH } from "../src/templateConfig.mjs";

test("importQuoteWorkbook extracts QuoteLine rows from a V5 quote workbook", async () => {
  const catalog = await loadCatalogFromTemplate();
  const result = await importQuoteWorkbook(await FileBlob.load(DEFAULT_TEMPLATE_PATH), catalog);

  assert.equal(result.lines.some((line) => line.name === "Sony ILME-FX3"), true);
  assert.equal(result.lines.some((line) => line.name === "导播（4-6）"), true);
  assert.equal(result.lines.every((line) => line.source === "import"), true);
  assert.equal(result.confidence > 0.8, true);
  assert.equal(Array.isArray(result.unmatched), true);
});
