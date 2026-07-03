import fs from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("server exposes the phase-2 APIs and removes the old selection generate route", async () => {
  const server = await fs.readFile(new URL("../src/server.mjs", import.meta.url), "utf8");

  assert.match(server, /\/api\/catalog/);
  assert.match(server, /\/api\/packages/);
  assert.match(server, /\/api\/schemes/);
  assert.match(server, /\/api\/import-quote/);
  assert.match(server, /\/api\/price\/import/);
  assert.match(server, /\/api\/price\/update/);
  assert.match(server, /\/api\/price\/list/);
  assert.match(server, /isPricePasswordValid/);
  assert.match(server, /readPricePassword/);
  assert.match(server, /\/api\/generate-download/);
  assert.match(server, /loadReusableSchemes/);
  assert.match(server, /saveQuoteScheme/);
  assert.equal(server.includes('url.pathname === "/api/generate"'), false);
  assert.equal(server.includes('url.pathname === "/api/price-import"'), false);
});
