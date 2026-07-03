import test from "node:test";
import assert from "node:assert/strict";
import * as generator from "../src/excelGenerator.mjs";

const { buildCategoryMergeRanges, parseFormulaIssues } = generator;

test("parseFormulaIssues treats zero-match notices as no formula issues", () => {
  const issues = parseFormulaIssues('{"kind":"notice","message":"Cell search matched 0 entries."}\n');
  assert.deepEqual(issues, []);
});

test("parseFormulaIssues keeps actual formula error matches", () => {
  const issues = parseFormulaIssues(
    '{"kind":"match","sheet":"报价单","address":"I14","value":"#N/A"}\n',
  );
  assert.deepEqual(issues, [
    {
      kind: "match",
      sheet: "报价单",
      address: "I14",
      value: "#N/A",
    },
  ]);
});

test("buildCategoryMergeRanges groups adjacent rows by category for standard quote layout", () => {
  const ranges = buildCategoryMergeRanges(8, [
    { category: "摄像设备" },
    { category: "摄像设备" },
    { category: "导播设备" },
    { category: "导播设备" },
    { category: "网络设备" },
  ]);

  assert.deepEqual(ranges, [
    { category: "摄像设备", range: "A8:A9" },
    { category: "导播设备", range: "A10:A11" },
  ]);
});

test("generator is configured for the V5 quote template layout", () => {
  assert.equal(generator.DEFAULT_TEMPLATE_PATH, "/Users/momo/Downloads/导摄报价单模板_V5(1).xlsx");
  assert.equal(generator.QUOTE_RENDER_RANGE, "A1:L107");
  assert.deepEqual(generator.SECTIONS.equipment, {
    sheet: "报价单",
    start: 8,
    end: 66,
    lookup: true,
    cols: 12,
  });
  assert.deepEqual(generator.SECTIONS.personnel, {
    sheet: "报价单",
    start: 69,
    end: 86,
    lookup: true,
    cols: 12,
  });
  assert.deepEqual(generator.SECTIONS.reimbursement, {
    sheet: "报价单",
    start: 90,
    end: 93,
    lookup: false,
    cols: 12,
  });
});

test("buildSectionValues places QuoteLine rows inside V5 category blocks", () => {
  const values = generator.buildSectionValues("equipment", generator.SECTIONS.equipment, [
    {
      lineId: "line_router",
      productId: "router",
      type: "equipment",
      category: "网络和传输设备",
      name: "路由器",
      model: "路由器",
      unitPrice: 0,
      quantity: 1,
      days: 1,
      rehearsalQuantity: 0,
      rehearsalDays: 0,
      remark: "",
      provider: "RMM",
      source: "catalog",
    },
    {
      lineId: "line_fx6",
      productId: "fx6",
      type: "equipment",
      category: "摄像设备",
      name: "Sony ILME-FX6",
      model: "Sony ILME-FX6",
      unitPrice: 0,
      quantity: 2,
      days: 1,
      rehearsalQuantity: 1,
      rehearsalDays: 2,
      remark: "竖拍",
      provider: "RMM",
      source: "catalog",
    },
  ]);

  assert.equal(values[0][0], "摄像设备");
  assert.equal(values[0][1], "Sony ILME-FX6");
  assert.equal(values[0][4], 2);
  assert.equal(values[13][0], "导播设备");
  assert.equal(values[13][1], null);
  assert.equal(values[34][0], "网络和传输设备");
  assert.equal(values[34][1], "路由器");
});

test("buildUnusedDetailRows returns empty template rows to compact after rendering", () => {
  const rows = generator.buildUnusedDetailRows("equipment", generator.SECTIONS.equipment, [
    {
      category: "摄像设备",
      name: "Sony ILME-FX6",
      model: "Sony ILME-FX6",
      quantity: 1,
      days: 1,
      rehearsalQuantity: 0,
      rehearsalDays: 0,
    },
    {
      category: "导播设备",
      name: "ATEM",
      model: "ATEM",
      quantity: 1,
      days: 1,
      rehearsalQuantity: 0,
      rehearsalDays: 0,
    },
  ]);

  assert.equal(rows.includes(8), false);
  assert.equal(rows.includes(21), false);
  assert.equal(rows.includes(9), true);
  assert.equal(rows.includes(66), true);
});

test("markHiddenRowsInWorksheetXml writes real hidden row attributes for exported xlsx files", () => {
  const xml =
    '<x:worksheet><x:sheetData><x:row r="8" ht="19" hidden="0" customHeight="1"></x:row><x:row r="9" customHeight="1"></x:row></x:sheetData></x:worksheet>';

  const patched = generator.markHiddenRowsInWorksheetXml(xml, [9]);

  assert.match(patched, /<x:row r="8" ht="19" hidden="0" customHeight="1">/);
  assert.match(patched, /<x:row r="9" customHeight="1" hidden="1" ht="0">/);
});
