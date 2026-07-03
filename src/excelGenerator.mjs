import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import {
  createLineSubtotalFormula,
  createLookupFormula,
  makeOutputFileName,
} from "./quoteModel.mjs";
import { applyPriceBook, normalizeQuoteLines } from "./quoteLineModel.mjs";
import {
  CATEGORY_BLOCKS,
  DEFAULT_TEMPLATE_PATH,
  OUTPUT_DIR,
  QUOTE_RENDER_RANGE,
  SECTIONS,
} from "./templateConfig.mjs";

export { DEFAULT_TEMPLATE_PATH, OUTPUT_DIR, QUOTE_RENDER_RANGE, SECTIONS };

const execFileAsync = promisify(execFile);

export async function generateQuoteWorkbook({ lines = [], priceBook = {}, project = {} }) {
  const quoteLines = applyPriceBook(normalizeQuoteLines(lines), priceBook);
  const rowsByType = {
    equipment: quoteLines.filter((line) => line.type === "equipment"),
    personnel: quoteLines.filter((line) => line.type === "personnel"),
    reimbursement: quoteLines.filter((line) => line.type === "reimbursement"),
  };
  const unusedDetailRows = Object.entries(rowsByType).flatMap(([type, rows]) =>
    buildUnusedDetailRows(type, SECTIONS[type], rows),
  );
  const input = await FileBlob.load(DEFAULT_TEMPLATE_PATH);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const quoteSheet = workbook.worksheets.getItem("报价单");

  writeProjectFields(quoteSheet, project);
  writeSection(quoteSheet, "equipment", rowsByType.equipment);
  writeSection(quoteSheet, "personnel", rowsByType.personnel);
  writeSection(quoteSheet, "reimbursement", rowsByType.reimbursement);

  const formulaIssues = await scanFormulaIssues(workbook);
  const fileName = makeOutputFileName(project.projectName, new Date());
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, fileName);

  const preview = await workbook.render({
    sheetName: "报价单",
    range: QUOTE_RENDER_RANGE,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  const previewBytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(outputPath.replace(/\.xlsx$/i, ".png"), previewBytes);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  await markHiddenRowsInWorkbook(outputPath, "报价单", unusedDetailRows);

  return {
    outputPath,
    previewPath: outputPath.replace(/\.xlsx$/i, ".png"),
    formulaIssues,
    estimatedTaxExclusiveTotal: estimateLinesTotal(quoteLines),
  };
}

function writeProjectFields(sheet, project) {
  const projectName = project.projectName || "项目名称";
  sheet.getRange("A1").values = [[projectName]];
  sheet.getRange("B2").values = [[project.brand || ""]];
  sheet.getRange("B3").values = [[project.location || ""]];
  sheet.getRange("B4").values = [[project.rehearsalTime || ""]];
  sheet.getRange("B5").values = [[project.liveTime || ""]];
  sheet.getRange("H5").values = [[project.contact || ""]];
}

function writeSection(sheet, type, rows) {
  const section = SECTIONS[type];
  const rowCount = section.end - section.start + 1;
  const values = buildSectionValues(type, section, rows);

  sheet.getRange(`B${section.start}:L${section.end}`).values = values.map((row) => row.slice(1));

  const subtotalFormulas = Array.from({ length: rowCount }, (_, index) => [
    createLineSubtotalFormula(type, section.start + index),
  ]);
  sheet.getRange(`H${section.start}:H${section.end}`).formulas = subtotalFormulas;

  if (section.lookup) {
    const lookupFormulas = Array.from({ length: rowCount }, (_, index) => [
      createLookupFormula(type, section.start + index),
    ]);
    sheet.getRange(`I${section.start}:I${section.end}`).formulas = lookupFormulas;
  }

  autofitPopulatedRows(sheet, section, values);
  compactUnusedRows(sheet, type, section, rows);
}

export function buildSectionValues(type, section, rows) {
  const rowCount = section.end - section.start + 1;
  const values = Array.from({ length: rowCount }, () => Array(section.cols).fill(null));
  const blocks = CATEGORY_BLOCKS[type];

  if (!blocks) {
    rows.forEach((row, index) => {
      if (index < rowCount) values[index] = formatSectionRow(type, row);
    });
    return values;
  }

  const rowsByCategory = new Map();
  for (const row of rows) {
    const category = row.category || "";
    rowsByCategory.set(category, [...(rowsByCategory.get(category) || []), row]);
  }

  for (const block of blocks) {
    const blockIndex = block.start - section.start;
    values[blockIndex][0] = block.category;

    const categoryRows = rowsByCategory.get(block.category) || [];
    const capacity = block.end - block.start + 1;
    if (categoryRows.length > capacity) {
      throw new Error(`${block.category}最多支持 ${capacity} 项，当前 ${categoryRows.length} 项`);
    }

    categoryRows.forEach((row, index) => {
      values[blockIndex + index] = formatSectionRow(type, row);
      values[blockIndex + index][0] = index === 0 ? block.category : null;
    });
  }

  return values;
}

function formatSectionRow(type, row) {
  if (type === "reimbursement") {
    return [
      row.category,
      row.name,
      null,
      cellOrNull(row.unitPrice),
      null,
      row.days,
      null,
      null,
      null,
      row.remark,
      null,
      null,
    ];
  }

  return [
    row.category,
    row.name,
    row.model,
    cellOrNull(row.unitPrice),
    calculateRehearsalUnits(row) || null,
    row.quantity,
    row.days,
    null,
    null,
    row.remark,
    row.provider,
    null,
  ];
}

export function buildUnusedDetailRows(type, section, rows) {
  const values = buildSectionValues(type, section, rows);
  const unusedRows = [];
  values.forEach((cells, index) => {
    const rowNumber = section.start + index;
    const hasDetail = cells.slice(1).some((value) => value !== null && value !== "");
    if (!hasDetail) unusedRows.push(rowNumber);
  });
  return unusedRows;
}

function compactUnusedRows(sheet, type, section, rows) {
  for (const rowNumber of buildUnusedDetailRows(type, section, rows)) {
    const range = sheet.getRange(`A${rowNumber}:L${rowNumber}`);
    range.format.rowHeight = 0;
    range.format.hidden = true;
  }
}

async function markHiddenRowsInWorkbook(workbookPath, sheetName, rowNumbers) {
  const uniqueRows = [...new Set(rowNumbers)].sort((a, b) => a - b);
  if (!uniqueRows.length) return;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "quote-xlsx-"));
  try {
    await execFileAsync("/usr/bin/unzip", ["-q", workbookPath, "-d", tempDir]);
    const worksheetPath = await resolveWorksheetXmlPath(tempDir, sheetName);
    const xml = await fs.readFile(worksheetPath, "utf8");
    await fs.writeFile(worksheetPath, markHiddenRowsInWorksheetXml(xml, uniqueRows));
    await fs.rm(workbookPath);
    await execFileAsync("/usr/bin/zip", ["-qr", workbookPath, "."], { cwd: tempDir });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function resolveWorksheetXmlPath(unzippedWorkbookDir, sheetName) {
  const workbookXml = await fs.readFile(path.join(unzippedWorkbookDir, "xl", "workbook.xml"), "utf8");
  const relsXml = await fs.readFile(
    path.join(unzippedWorkbookDir, "xl", "_rels", "workbook.xml.rels"),
    "utf8",
  );
  const sheetRelId = findSheetRelId(workbookXml, sheetName);
  const target = findRelationshipTarget(relsXml, sheetRelId);
  if (!target) throw new Error(`未找到 ${sheetName} 对应的 worksheet xml`);
  const normalizedTarget = target.replace(/^\/?xl\//, "");
  return path.join(unzippedWorkbookDir, "xl", normalizedTarget);
}

function findSheetRelId(workbookXml, sheetName) {
  const sheetTagPattern = /<[^>]*:?sheet\b[^>]*>/g;
  for (const [tag] of workbookXml.matchAll(sheetTagPattern)) {
    if (getXmlAttribute(tag, "name") === sheetName) {
      const relId = getXmlAttribute(tag, "r:id") || getXmlAttribute(tag, "id");
      if (relId) return relId;
    }
  }
  throw new Error(`未找到工作表：${sheetName}`);
}

function findRelationshipTarget(relsXml, relId) {
  const relTagPattern = /<[^>]*:?Relationship\b[^>]*>/g;
  for (const [tag] of relsXml.matchAll(relTagPattern)) {
    if (getXmlAttribute(tag, "Id") === relId) return getXmlAttribute(tag, "Target");
  }
  return "";
}

function getXmlAttribute(tag, name) {
  const escapedName = name.replace(":", "\\:");
  const match = tag.match(new RegExp(`\\b${escapedName}="([^"]*)"`));
  return match?.[1] || "";
}

export function markHiddenRowsInWorksheetXml(xml, rowNumbers) {
  let patched = xml;
  for (const rowNumber of rowNumbers) {
    const rowPattern = new RegExp(`<[^>]*:?row\\b(?=[^>]*\\br="${rowNumber}")[^>]*>`, "g");
    patched = patched.replace(rowPattern, (tag) =>
      setXmlAttribute(setXmlAttribute(setXmlAttribute(tag, "hidden", "1"), "ht", "0"), "customHeight", "1"),
    );
  }
  return patched;
}

function setXmlAttribute(tag, name, value) {
  const escapedName = name.replace(":", "\\:");
  const attributePattern = new RegExp(`\\s${escapedName}="[^"]*"`);
  if (attributePattern.test(tag)) return tag.replace(attributePattern, ` ${name}="${value}"`);
  const closing = tag.endsWith("/>") ? "/>" : ">";
  return `${tag.slice(0, -closing.length)} ${name}="${value}"${closing}`;
}

function autofitPopulatedRows(sheet, section, values) {
  values.forEach((cells, index) => {
    const hasDetail = cells.slice(1).some((value) => value !== null && value !== "");
    if (hasDetail) {
      const rowNumber = section.start + index;
      sheet.getRange(`A${rowNumber}:L${rowNumber}`).format.autofitRows();
    }
  });
}

export function buildCategoryMergeRanges(startRow, rows) {
  const ranges = [];
  let groupStart = null;
  let currentCategory = null;

  rows.forEach((row, index) => {
    const category = row.category || "";
    if (!category) return;

    if (category !== currentCategory) {
      pushGroup();
      groupStart = index;
      currentCategory = category;
    }
  });
  pushGroup();

  return ranges;

  function pushGroup() {
    if (groupStart === null || !currentCategory) return;
    let groupEnd = groupStart;
    for (let index = groupStart + 1; index < rows.length; index += 1) {
      if ((rows[index].category || "") !== currentCategory) break;
      groupEnd = index;
    }
    if (groupEnd > groupStart) {
      ranges.push({
        category: currentCategory,
        range: `A${startRow + groupStart}:A${startRow + groupEnd}`,
      });
    }
    groupStart = null;
    currentCategory = null;
  }
}

async function scanFormulaIssues(workbook) {
  const result = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "formula error scan",
    maxChars: 12000,
  });
  return parseFormulaIssues(result.ndjson);
}

export function parseFormulaIssues(ndjson) {
  if (!ndjson.trim()) return [];
  return ndjson
    .trim()
    .split(/\n+/)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    })
    .filter((record) => record.kind !== "notice");
}

function estimateLinesTotal(lines) {
  return lines.reduce((sum, line) => {
    if (line.unitPrice === undefined || line.unitPrice === null) return sum;
    const unitPrice = Number(line.unitPrice || 0);
    const liveUnits = Number(line.quantity || 0) * Number(line.days || 0);
    return sum + unitPrice * (liveUnits + calculateRehearsalUnits(line));
  }, 0);
}

function cellOrNull(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function calculateRehearsalUnits(line) {
  return Number(line.rehearsalQuantity || 0) * Number(line.rehearsalDays || 0);
}
