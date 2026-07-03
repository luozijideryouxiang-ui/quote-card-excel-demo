import fs from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("quote workspace exposes estimate mode, quote mode, tax totals, rehearsal inputs, and card decrement", async () => {
  const indexHtml = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(indexHtml, /estimateModeBtn/);
  assert.match(indexHtml, /quoteModeBtn/);
  assert.match(indexHtml, /taxExclusiveTotal/);
  assert.match(indexHtml, /taxInclusiveTotal/);
  assert.match(appJs, /workflowMode/);
  assert.match(appJs, /rehearsalQuantity/);
  assert.match(appJs, /rehearsalDays/);
  assert.match(appJs, /data-card-step="-1"/);
  assert.match(appJs, /taxInclusiveTotal/);
});

test("project date fields use calendar inputs and rehearsal date defaults quote lines to one rehearsal day", async () => {
  const indexHtml = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(indexHtml, /id="rehearsalTime"[^>]*type="date"/);
  assert.match(indexHtml, /id="liveTime"[^>]*type="date"/);
  assert.match(appJs, /applyRehearsalDateDefaults/);
  assert.match(appJs, /refs\.rehearsalTime\.addEventListener\("change"/);
  assert.match(appJs, /hasRehearsalDate\(\)/);
  assert.match(appJs, /rehearsalDays:[\s\S]*hasRehearsalDate\(\) \? 1 : 0/);
  assert.match(appJs, /line\.rehearsalDays = 1/);
});

test("quote rows expose provider selection and estimate uses provider price options", async () => {
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(appJs, /data-field="provider"/);
  assert.match(appJs, /providerOptionsForLine/);
  assert.match(appJs, /providerPrices/);
  assert.match(appJs, /chooseProviderPrice/);
});
