export function corsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "*",
  };
}

export function downloadHeaders({
  fileName,
  outputPath,
  previewPath,
  formulaIssueCount,
  contentLength,
}) {
  return {
    ...corsHeaders(),
    "Access-Control-Expose-Headers":
      "Content-Disposition,X-Quote-Output-Path,X-Quote-Preview-Path,X-Quote-Formula-Issues",
    "Content-Disposition": makeContentDisposition(fileName),
    "Content-Length": String(contentLength),
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "X-Quote-Formula-Issues": String(formulaIssueCount),
    "X-Quote-Output-Path": encodeURIComponent(outputPath || ""),
    "X-Quote-Preview-Path": encodeURIComponent(previewPath || ""),
  };
}

export function jsonHeaders() {
  return {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function textHeaders(contentType = "text/plain; charset=utf-8") {
  return {
    ...corsHeaders(),
    "Content-Type": contentType,
  };
}

function makeContentDisposition(fileName) {
  const encoded = encodeURIComponent(fileName || "quote.xlsx").replaceAll("'", "%27");
  return `attachment; filename="quote.xlsx"; filename*=UTF-8''${encoded}`;
}
