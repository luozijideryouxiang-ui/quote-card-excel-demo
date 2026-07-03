import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeStandaloneHtml } from "../src/standaloneHtml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputName = "报价单快速生成器.html";
const workspaceOutput = path.join(rootDir, outputName);
const desktopOutput = path.join(
  "/Users/momo/Desktop/02_财务表格/报价单生成工具",
  outputName,
);

const [html, css, appJs] = await Promise.all([
  fs.readFile(path.join(rootDir, "public", "index.html"), "utf8"),
  fs.readFile(path.join(rootDir, "public", "styles.css"), "utf8"),
  fs.readFile(path.join(rootDir, "public", "app.js"), "utf8"),
]);

const standalone = makeStandaloneHtml({
  html,
  css,
  appJs,
  apiBase: "http://127.0.0.1:4173",
});

await fs.mkdir(path.dirname(desktopOutput), { recursive: true });
await fs.writeFile(workspaceOutput, standalone, "utf8");
await fs.writeFile(desktopOutput, standalone, "utf8");

console.log(JSON.stringify({ workspaceOutput, desktopOutput }, null, 2));
