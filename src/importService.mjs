import path from "node:path";
import { importQuoteWorkbook } from "./importEngine.mjs";
import { DEFAULT_TEMPLATE_PATH } from "./templateConfig.mjs";
import {
  formatLocalTimestamp,
  readJsonFile,
  resolveSettingsPath,
  writeJsonFile,
} from "./settingsService.mjs";

const IMPORT_HISTORY_FILE = "importHistory.json";

export async function importQuoteToHistory({
  input,
  catalog,
  dataDir,
  sourceFileName,
  now = new Date(),
}) {
  const imported = await importQuoteWorkbook(input, catalog);
  const importedAt = formatLocalTimestamp(now);
  const project = {
    sourceFileName: sourceFileName || path.basename(DEFAULT_TEMPLATE_PATH),
    importedAt,
  };
  const matchedRate = imported.confidence;
  const result = {
    project,
    lines: imported.lines,
    matchedRate,
    unmatched: imported.unmatched,
  };

  const history = await loadImportHistory({ dataDir });
  const record = {
    id: createImportId(now),
    importedAt,
    sourceFileName: project.sourceFileName,
    matchedRate,
    lineCount: imported.lines.length,
    unmatchedCount: imported.unmatched.length,
    lines: imported.lines,
    unmatched: imported.unmatched,
  };
  await writeJsonFile(resolveSettingsPath(dataDir, IMPORT_HISTORY_FILE), [record, ...history].slice(0, 100));

  return result;
}

export async function loadImportHistory({ dataDir }) {
  const history = await readJsonFile(resolveSettingsPath(dataDir, IMPORT_HISTORY_FILE), []);
  return Array.isArray(history) ? history : [];
}

function createImportId(now) {
  return `import_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
}
