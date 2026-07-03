import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./catalogService.mjs";
import { generateQuoteWorkbook } from "./excelGenerator.mjs";
import { corsHeaders, downloadHeaders, jsonHeaders, textHeaders } from "./httpHeaders.mjs";
import { importQuoteToHistory, loadImportHistory } from "./importService.mjs";
import { loadPackages, savePackages, upsertPackage } from "./packageService.mjs";
import { isPricePasswordValid, readPricePassword } from "./priceAuth.mjs";
import {
  importPriceText,
  importPriceWorkbook,
  loadPriceEntries,
  priceEntriesToRenderBook,
  updatePriceEntry,
} from "./priceService.mjs";
import { loadReusableSchemes, saveQuoteScheme } from "./schemeService.mjs";
import { resolveStaticPath } from "./staticFiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/api/catalog") {
      const catalog = await readCatalog();
      return sendJson(res, 200, { ok: true, catalog });
    }

    if (req.method === "GET" && url.pathname === "/api/packages") {
      const catalog = await readCatalog();
      return sendJson(res, 200, { ok: true, packages: await loadPackages({ catalog, dataDir }) });
    }

    if (req.method === "POST" && url.pathname === "/api/packages") {
      const body = await readJsonBody(req);
      const catalog = await readCatalog();
      const packages = Array.isArray(body.packages)
        ? await savePackages({ dataDir, packages: body.packages })
        : await upsertPackage({ catalog, dataDir, packageConfig: body.package || body });
      return sendJson(res, 200, { ok: true, packages });
    }

    if (req.method === "GET" && url.pathname === "/api/schemes") {
      return sendJson(res, 200, { ok: true, schemes: await loadReusableSchemes({ dataDir }) });
    }

    if (req.method === "POST" && url.pathname === "/api/schemes") {
      const body = await readJsonBody(req);
      const result = await saveQuoteScheme({
        dataDir,
        name: body.name || body.projectName,
        lines: body.lines || [],
      });
      return sendJson(res, 200, { ok: true, scheme: result.scheme, schemes: await loadReusableSchemes({ dataDir }) });
    }

    if (req.method === "POST" && url.pathname === "/api/import-quote") {
      const catalog = await readCatalog();
      const buffer = await readRawBody(req);
      const result = await importQuoteToHistory({
        input: toArrayBuffer(buffer),
        catalog,
        dataDir,
        sourceFileName: decodeHeader(req.headers["x-file-name"]),
      });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (req.method === "GET" && url.pathname === "/api/import-history") {
      return sendJson(res, 200, { ok: true, history: await loadImportHistory({ dataDir }) });
    }

    if (req.method === "GET" && url.pathname === "/api/price/list") {
      if (req.headers["x-price-password"] && !isPricePasswordValid(readPricePassword(req))) {
        return sendJson(res, 401, { ok: false, error: "价格功能密码不正确" });
      }
      return sendJson(res, 200, { ok: true, entries: await loadPriceEntries({ dataDir }) });
    }

    if (req.method === "POST" && url.pathname === "/api/price/import") {
      const catalog = await readCatalog();
      const buffer = await readRawBody(req);
      const contentType = req.headers["content-type"] || "";
      const body = contentType.includes("application/json") ? readJsonBodyFromBuffer(buffer) : {};
      if (!isPricePasswordValid(readPricePassword(req, body))) {
        return sendJson(res, 401, { ok: false, error: "价格功能密码不正确" });
      }
      const result = contentType.includes("application/json")
        ? await importPriceText({ text: body.text || "", catalog, dataDir })
        : await importPriceWorkbook({ input: toArrayBuffer(buffer), catalog, dataDir });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (req.method === "POST" && url.pathname === "/api/price/update") {
      const body = await readJsonBody(req);
      if (!isPricePasswordValid(readPricePassword(req, body))) {
        return sendJson(res, 401, { ok: false, error: "价格功能密码不正确" });
      }
      const result = await updatePriceEntry({ dataDir, entry: body.entry || body });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (req.method === "POST" && url.pathname === "/api/generate-download") {
      const body = await readJsonBody(req);
      const storedPriceBook = await priceEntriesToRenderBook({ dataDir, lines: body.lines || [] });
      const result = await generateQuoteWorkbook({
        lines: body.lines || [],
        priceBook: { ...storedPriceBook, ...(body.priceBook || {}) },
        project: body.project || {},
      });
      return await sendGeneratedWorkbook(res, result);
    }

    if (req.method === "GET") {
      return await serveStatic(url.pathname, res);
    }

    sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || String(error) });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Quote card Excel demo: http://127.0.0.1:${port}`);
});

async function readCatalog() {
  return await loadCatalog();
}

async function readJsonBody(req) {
  return readJsonBodyFromBuffer(await readRawBody(req));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function readJsonBodyFromBuffer(buffer) {
  if (!buffer.length) return {};
  return JSON.parse(buffer.toString("utf8"));
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function decodeHeader(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

async function serveStatic(pathname, res) {
  const filePath = resolveStaticPath(pathname, publicDir);
  if (!filePath) {
    return sendText(res, 403, "Forbidden");
  }

  let body;
  try {
    body = await fs.readFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
  const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(body);
}

function sendJson(res, status, body) {
  res.writeHead(status, jsonHeaders());
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body) {
  res.writeHead(status, textHeaders());
  res.end(body);
}

async function sendGeneratedWorkbook(res, result) {
  const body = await fs.readFile(result.outputPath);
  res.writeHead(
    200,
    downloadHeaders({
      fileName: path.basename(result.outputPath),
      outputPath: result.outputPath,
      previewPath: result.previewPath,
      formulaIssueCount: result.formulaIssues.length,
      contentLength: body.length,
    }),
  );
  res.end(body);
}
