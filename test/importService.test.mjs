import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { FileBlob } from "@oai/artifact-tool";
import { loadCatalogFromTemplate } from "../src/catalogExtractor.mjs";
import { importQuoteToHistory, loadImportHistory } from "../src/importService.mjs";
import { DEFAULT_TEMPLATE_PATH } from "../src/templateConfig.mjs";

test("importQuoteToHistory stores imported V5 quotes as learning records", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-import-history-"));
  const catalog = await loadCatalogFromTemplate();

  const result = await importQuoteToHistory({
    input: await FileBlob.load(DEFAULT_TEMPLATE_PATH),
    catalog,
    dataDir,
    now: new Date("2026-07-03T00:00:00+08:00"),
  });

  assert.equal(Array.isArray(result.lines), true);
  assert.equal(result.lines.length > 0, true);
  assert.equal(typeof result.matchedRate, "number");
  assert.equal(result.project.sourceFileName, "导摄报价单模板_V5(1).xlsx");

  const history = await loadImportHistory({ dataDir });
  assert.equal(history.length, 1);
  assert.equal(history[0].matchedRate, result.matchedRate);
  assert.equal(history[0].lineCount, result.lines.length);
});
