import path from "node:path";

export function resolveStaticPath(pathname, publicDir) {
  const publicRoot = path.resolve(publicDir);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const decoded = decodeURIComponent(requestPath);
  if (decoded.includes("\0")) return null;

  const relativePath = decoded.replace(/^\/+/, "");
  const filePath = path.resolve(publicRoot, relativePath);
  if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
    return null;
  }
  return filePath;
}
