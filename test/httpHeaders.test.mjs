import test from "node:test";
import assert from "node:assert/strict";
import { downloadHeaders, jsonHeaders } from "../src/httpHeaders.mjs";

test("jsonHeaders allows standalone file HTML to call the local API", () => {
  assert.deepEqual(jsonHeaders(), {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
});

test("downloadHeaders tells the browser to download the generated workbook", () => {
  const headers = downloadHeaders({
    fileName: "V5模板格式测试_报价单.xlsx",
    outputPath: "/Users/momo/Desktop/02_财务表格/报价单生成工具/V5模板格式测试_报价单.xlsx",
    previewPath: "/Users/momo/Desktop/02_财务表格/报价单生成工具/V5模板格式测试_报价单.png",
    formulaIssueCount: 0,
    contentLength: 1234,
  });

  assert.equal(headers["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(headers["Content-Length"], "1234");
  assert.match(headers["Content-Disposition"], /^attachment; filename="quote\.xlsx"; filename\*=UTF-8''/);
  assert.match(headers["Content-Disposition"], /V5%E6%A8%A1%E6%9D%BF/);
  assert.equal(headers["X-Quote-Formula-Issues"], "0");
  assert.equal(
    decodeURIComponent(headers["X-Quote-Output-Path"]),
    "/Users/momo/Desktop/02_财务表格/报价单生成工具/V5模板格式测试_报价单.xlsx",
  );
  assert.equal(headers["Access-Control-Expose-Headers"].includes("Content-Disposition"), true);
});
