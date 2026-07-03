import test from "node:test";
import assert from "node:assert/strict";
import { makeStandaloneHtml } from "../src/standaloneHtml.mjs";

test("makeStandaloneHtml embeds CSS, app JS, and localhost API base without embedding catalog data", () => {
  const html = makeStandaloneHtml({
    html: '<html><head><link rel="stylesheet" href="/styles.css" /></head><body><a href="/settings.html">Settings</a><script type="module" src="/app.js"></script></body></html>',
    css: "body { color: red; }",
    appJs: "const response = await fetch(apiUrl('/api/catalog'));",
    apiBase: "http://127.0.0.1:4173",
  });

  assert.match(html, /<style>\s*body \{ color: red; \}\s*<\/style>/);
  assert.match(html, /window\.__QUOTE_API_BASE__ = "http:\/\/127\.0\.0\.1:4173";/);
  assert.doesNotMatch(html, /window\.__QUOTE_CATALOG__/);
  assert.doesNotMatch(html, /Sony ILME-FX6/);
  assert.doesNotMatch(html, /src="\/app\.js"/);
  assert.doesNotMatch(html, /href="\/styles\.css"/);
  assert.match(html, /href="http:\/\/127\.0\.0\.1:4173\/settings\.html"/);
});
