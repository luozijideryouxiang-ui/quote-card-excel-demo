import fs from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("quote workspace keeps Settings-only controls out of the front page", async () => {
  const indexHtml = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(indexHtml, /href="\/settings\.html"/);
  assert.doesNotMatch(indexHtml, /importQuoteInput|priceText|priceImportBtn|priceFileInput/);
  assert.doesNotMatch(appJs, /importQuoteFile|importPriceText|importPriceFile|\/api\/price-import/);
  assert.match(appJs, /\/api\/price\/list/);
});

test("settings center exposes price, import, catalog, and package management areas", async () => {
  const settingsHtml = await fs.readFile(new URL("../public/settings.html", import.meta.url), "utf8");
  const settingsJs = await fs.readFile(new URL("../public/settings.js", import.meta.url), "utf8");

  assert.match(settingsHtml, /Settings Center/);
  assert.match(settingsHtml, /价格管理/);
  assert.match(settingsHtml, /pricePasswordInput/);
  assert.match(settingsHtml, /各家年框价|年框核价模板/);
  assert.match(settingsHtml, /Excel导入报价单/);
  assert.match(settingsHtml, /设备库管理/);
  assert.match(settingsHtml, /套餐管理/);
  assert.match(settingsJs, /\/api\/price\/import/);
  assert.match(settingsJs, /\/api\/price\/update/);
  assert.match(settingsJs, /X-Price-Password/);
  assert.match(settingsJs, /formatProviderPrices/);
  assert.match(settingsJs, /\/api\/import-quote/);
  assert.match(settingsJs, /\/api\/packages/);
});

test("quote workspace exposes reusable scheme library controls", async () => {
  const indexHtml = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(indexHtml, /schemeModeBtn/);
  assert.match(indexHtml, /saveSchemeBtn/);
  assert.match(indexHtml, /方案库/);
  assert.match(appJs, /\/api\/schemes/);
  assert.match(appJs, /renderSchemeCards/);
  assert.match(appJs, /saveCurrentScheme/);
  assert.match(appJs, /loadSchemeLines/);
});
