import { SpreadsheetFile } from "@oai/artifact-tool";
import { matchProduct } from "./catalogExtractor.mjs";
import { createCustomQuoteLine, createQuoteLine } from "./quoteLineModel.mjs";
import { SECTIONS } from "./templateConfig.mjs";

const SECTION_RANGES = [
  { type: "equipment", start: SECTIONS.equipment.start, end: SECTIONS.equipment.end },
  { type: "personnel", start: SECTIONS.personnel.start, end: SECTIONS.personnel.end },
  { type: "reimbursement", start: SECTIONS.reimbursement.start, end: SECTIONS.reimbursement.end },
];

export async function importQuoteWorkbook(input, catalog) {
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheet = workbook.worksheets.getItem("报价单");
  const lines = [];
  const unmatched = [];

  for (const section of SECTION_RANGES) {
    let currentCategory = "";
    const values = sheet.getRange(`A${section.start}:L${section.end}`).values;
    values.forEach((row, index) => {
      const rowNumber = section.start + index;
      if (row[0]) currentCategory = String(row[0]).trim();
      const name = String(row[1] || "").trim();
      if (!name || name === "项目" || name === "可自定义") return;

      const parsed = parseRow(section.type, currentCategory, row, rowNumber);
      const match = matchProduct(parsed.name, catalog);
      if (match) {
        lines.push({
          ...createQuoteLine(match.product, {
            lineId: `import_${rowNumber}`,
            model: parsed.model,
            quantity: parsed.quantity,
            days: parsed.days,
            remark: parsed.remark,
            provider: parsed.provider || match.product.provider,
            isAnnualFrame: parsed.isAnnualFrame,
            source: "import",
          }),
          category: parsed.category || match.product.category,
        });
      } else {
        const custom = createCustomQuoteLine({
          lineId: `import_${rowNumber}`,
          type: parsed.type,
          category: parsed.category,
          name: parsed.name,
          model: parsed.model,
          quantity: parsed.quantity,
          days: parsed.days,
          remark: parsed.remark,
          provider: parsed.provider,
          isAnnualFrame: parsed.isAnnualFrame,
        });
        lines.push({ ...custom, source: "import" });
        unmatched.push(custom);
      }
    });
  }

  const confidence = lines.length ? (lines.length - unmatched.length) / lines.length : 1;
  return { lines, unmatched, confidence };
}

function parseRow(type, category, row, rowNumber) {
  if (type === "reimbursement") {
    return {
      lineId: `import_${rowNumber}`,
      type,
      category: category || "实报实销",
      name: String(row[1] || "").trim(),
      model: "",
      quantity: 1,
      days: numberOrDefault(row[5], 1),
      remark: String(row[9] || ""),
      provider: "",
      isAnnualFrame: false,
    };
  }

  return {
    lineId: `import_${rowNumber}`,
    type,
    category,
    name: String(row[1] || "").trim(),
    model: String(row[2] || ""),
    quantity: numberOrDefault(row[5], 1),
    days: numberOrDefault(row[6], 1),
    remark: String(row[9] || ""),
    provider: String(row[10] || ""),
    isAnnualFrame: String(row[8] || "").trim() === "是",
  };
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
