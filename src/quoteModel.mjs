const LOOKUP_RANGES = {
  equipment: "'年框+自有设备清单'!$B$3:$C$120",
  personnel: "'年框+自有设备清单'!$B$124:$C$170",
};

export function createLineSubtotalFormula(type, rowNumber) {
  if (type === "reimbursement") {
    return `=IF(B${rowNumber}="","",D${rowNumber}*F${rowNumber})`;
  }
  return `=IF(B${rowNumber}="","",D${rowNumber}*(IF(E${rowNumber}="",0,E${rowNumber})+IF(F${rowNumber}="",0,F${rowNumber})*IF(G${rowNumber}="",0,G${rowNumber})))`;
}

export function createLookupFormula(type, rowNumber) {
  const lookupRange = LOOKUP_RANGES[type];
  if (!lookupRange) return "";
  return `=IF(B${rowNumber}="","",IFERROR(VLOOKUP(B${rowNumber},${lookupRange},2,FALSE),"未匹配"))`;
}

export function makeOutputFileName(projectName, now = new Date()) {
  const safeProject = String(projectName || "未命名项目")
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "未命名项目";
  const stamp = formatTimestamp(now);
  return `${safeProject}_报价单_${stamp}.xlsx`;
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}
