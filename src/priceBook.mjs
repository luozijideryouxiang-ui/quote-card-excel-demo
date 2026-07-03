import { SpreadsheetFile } from "@oai/artifact-tool";
import { matchProduct } from "./catalogExtractor.mjs";

export function parsePriceText(text, catalog) {
  const priceBook = {};
  const matched = [];
  const unmatched = [];

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parsePriceLine(line);
    if (!parsed) {
      unmatched.push({ raw: line, reason: "无法识别价格" });
      continue;
    }

    const match = matchProduct(parsed.name, catalog);
    if (!match) {
      unmatched.push({ raw: line, name: parsed.name, price: parsed.price, reason: "未匹配产品" });
      continue;
    }

    priceBook[match.product.id] = parsed.price;
    matched.push({
      productId: match.product.id,
      name: match.product.name,
      price: parsed.price,
      confidence: match.confidence,
      raw: line,
    });
  }

  return { priceBook, matched, unmatched };
}

export async function parsePriceWorkbook(input, catalog) {
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheet = workbook.worksheets.getItemAt(0);
  const values = sheet.getRange("A1:B300").values;
  const lines = values
    .filter(([name, price]) => name && price !== null && price !== undefined && price !== "")
    .map(([name, price]) => `${name}\t${price}`)
    .join("\n");
  return parsePriceText(lines, catalog);
}

function parsePriceLine(line) {
  const match = line.match(/^(.+?)[\s,，:：\t]+([0-9]+(?:\.[0-9]+)?)$/);
  if (!match) return null;
  return {
    name: match[1].trim(),
    price: Number(match[2]),
  };
}
