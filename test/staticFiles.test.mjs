import test from "node:test";
import assert from "node:assert/strict";
import { resolveStaticPath } from "../src/staticFiles.mjs";

test("resolveStaticPath maps root to index.html inside the public directory", () => {
  const resolved = resolveStaticPath("/", "/demo/public");
  assert.equal(resolved, "/demo/public/index.html");
});

test("resolveStaticPath blocks traversal outside the public directory", () => {
  const resolved = resolveStaticPath("/../secret.txt", "/demo/public");
  assert.equal(resolved, null);
});
