import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadReusableSchemes, loadSchemes, saveQuoteScheme } from "../src/schemeService.mjs";

const sampleLine = {
  lineId: "line_fx3",
  productId: "product_sony_ilme_fx3",
  type: "equipment",
  category: "摄像设备",
  name: "Sony ILME-FX3",
  model: "",
  quantity: 2,
  days: 1,
  rehearsalQuantity: 2,
  rehearsalDays: 1,
  remark: "主机位",
  provider: "RMM",
  isAnnualFrame: true,
  source: "catalog",
};

test("saveQuoteScheme persists current QuoteLine rows as a reusable custom scheme", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-scheme-save-"));

  const result = await saveQuoteScheme({
    dataDir,
    name: "2机位常用方案",
    lines: [sampleLine],
    now: new Date("2026-07-03T12:00:00+08:00"),
  });

  assert.equal(result.scheme.name, "2机位常用方案");
  assert.equal(result.scheme.source, "custom");
  assert.equal(result.scheme.lineCount, 1);
  assert.equal(result.scheme.lines[0].source, "custom");
  assert.equal(result.scheme.lines[0].quantity, 2);

  const saved = await loadSchemes({ dataDir });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "2机位常用方案");
});

test("loadReusableSchemes includes saved schemes and import history records", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-scheme-reuse-"));
  await saveQuoteScheme({
    dataDir,
    name: "常用直播方案",
    lines: [sampleLine],
    now: new Date("2026-07-03T12:00:00+08:00"),
  });
  await fs.mkdir(path.join(dataDir, "settings"), { recursive: true });
  await fs.writeFile(
    path.join(dataDir, "settings", "importHistory.json"),
    JSON.stringify(
      [
        {
          id: "import_1",
          importedAt: "2026-07-03T00:47:12+08:00",
          sourceFileName: "旧报价单.xlsx",
          lineCount: 1,
          lines: [{ ...sampleLine, lineId: "import_8", source: "import" }],
        },
      ],
      null,
      2,
    ),
    "utf8",
  );

  const reusable = await loadReusableSchemes({ dataDir });

  assert.equal(reusable.length, 2);
  assert.deepEqual(
    reusable.map((scheme) => [scheme.name, scheme.source, scheme.lineCount]),
    [
      ["常用直播方案", "custom", 1],
      ["旧报价单.xlsx", "import", 1],
    ],
  );
  assert.equal(reusable[1].lines[0].source, "import");
});
