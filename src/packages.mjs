import { normalizeSearchText } from "./catalogExtractor.mjs";

const PACKAGE_DEFINITIONS = [
  {
    packageId: "pkg_basic_2_camera",
    name: "2机位基础套餐",
    description: "基础双机位直播配置",
    items: [
      { name: "Sony ILME-FX3", quantity: 2, days: 1 },
      { name: "ATEM Constellation 8K（BMD 4M/E 8K切换台）", quantity: 1, days: 1 },
      { name: "Sony UWP-D21领夹麦克风（一拖一）", quantity: 2, days: 1 },
      { name: "导播（4-6）", quantity: 1, days: 1 },
      { name: "固定机位摄影师", quantity: 2, days: 1 },
    ],
  },
  {
    packageId: "pkg_live_4_camera",
    name: "4机位直播套餐",
    description: "常规多机位直播配置",
    items: [
      { name: "Sony ILME-FX3", quantity: 4, days: 1 },
      { name: "ATEM Constellation 8K（BMD 4M/E 8K切换台）", quantity: 1, days: 1 },
      { name: "LG 4K显示器", quantity: 2, days: 1 },
      { name: "Sony UWP-D21领夹麦克风（一拖一）", quantity: 2, days: 1 },
      { name: "导播（4-6）", quantity: 1, days: 1 },
      { name: "固定机位摄影师", quantity: 4, days: 1 },
    ],
  },
  {
    packageId: "pkg_ecommerce_live",
    name: "电商直播套餐",
    description: "电商直播间常用设备和人员配置",
    items: [
      { name: "Sony ILME-FX3", quantity: 3, days: 1 },
      { name: "ATEM Mini Extreme ISO G2（BMD 8路HDMI导播台）", quantity: 1, days: 1 },
      { name: "路由器", quantity: 1, days: 1 },
      { name: "导播（2-3）", quantity: 1, days: 1 },
      { name: "固定机位摄影师", quantity: 2, days: 1 },
      { name: "包装技术", quantity: 1, days: 1 },
    ],
  },
  {
    packageId: "pkg_large_multi_camera",
    name: "大型多机位场套餐",
    description: "大场活动和复杂直播配置",
    items: [
      { name: "Sony ILME-FX6", quantity: 6, days: 1 },
      { name: "ATEM Constellation 8K（BMD 4M/E 8K切换台）", quantity: 1, days: 1 },
      { name: "BMD ATEM 2 M/E Advanced Panel 20 （BMD 2M/E 控制面板）", quantity: 1, days: 1 },
      { name: "猛犸传声1000漫游版 一拖二十", quantity: 1, days: 1 },
      { name: "导播（6-8）", quantity: 1, days: 1 },
      { name: "固定机位摄影师", quantity: 6, days: 1 },
      { name: "音频技术", quantity: 1, days: 1 },
    ],
  },
];

export function buildDefaultPackages(catalog) {
  return PACKAGE_DEFINITIONS.map((definition) => ({
    packageId: definition.packageId,
    name: definition.name,
    description: definition.description,
    items: definition.items
      .map((item) => {
        const product = findProductByName(catalog, item.name);
        if (!product) return null;
        return {
          productId: product.id,
          quantity: item.quantity,
          days: item.days,
        };
      })
      .filter(Boolean),
  }));
}

function findProductByName(catalog, name) {
  const normalized = normalizeSearchText(name);
  return catalog.find((product) => normalizeSearchText(product.name) === normalized);
}
