import { buildDefaultPackages } from "./packages.mjs";
import { readJsonFile, resolveSettingsPath, writeJsonFile } from "./settingsService.mjs";

const PACKAGES_FILE = "packages.json";

export async function loadPackages({ catalog, dataDir }) {
  const saved = await readJsonFile(resolveSettingsPath(dataDir, PACKAGES_FILE), null);
  if (Array.isArray(saved) && saved.length) return normalizePackages(saved);
  return normalizePackages(buildDefaultPackages(catalog));
}

export async function savePackages({ dataDir, packages }) {
  const normalized = normalizePackages(packages);
  await writeJsonFile(resolveSettingsPath(dataDir, PACKAGES_FILE), normalized);
  return normalized;
}

export async function upsertPackage({ catalog, dataDir, packageConfig }) {
  const packages = await loadPackages({ catalog, dataDir });
  const normalized = normalizePackage(packageConfig);
  const index = packages.findIndex((item) => item.packageId === normalized.packageId);
  if (index >= 0) {
    packages[index] = normalized;
  } else {
    packages.push(normalized);
  }
  return await savePackages({ dataDir, packages });
}

export function normalizePackages(packages) {
  return (Array.isArray(packages) ? packages : []).map((item) => normalizePackage(item));
}

function normalizePackage(packageConfig) {
  return {
    packageId: String(packageConfig.packageId || createPackageId(packageConfig.name)),
    name: String(packageConfig.name || "未命名套餐"),
    description: String(packageConfig.description || ""),
    items: (Array.isArray(packageConfig.items) ? packageConfig.items : [])
      .map((item) => ({
        productId: String(item.productId || ""),
        quantity: numberOrDefault(item.quantity, 1),
        days: numberOrDefault(item.days, 1),
      }))
      .filter((item) => item.productId),
  };
}

function createPackageId(name) {
  return `pkg_${String(name || "custom")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()}`;
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
