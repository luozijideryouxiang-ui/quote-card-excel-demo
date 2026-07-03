import fs from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("front-end generates Excel through the browser download endpoint", async () => {
  const appJs = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(appJs, /\/api\/generate-download/);
  assert.match(appJs, /response\.blob\(\)/);
  assert.match(appJs, /downloadBlob\(/);
  assert.doesNotMatch(appJs, /apiUrl\("\/api\/generate"\)/);
  assert.doesNotMatch(appJs, /selection/);
  assert.doesNotMatch(appJs, /overrides/);
  assert.match(appJs, /lines:/);
});
