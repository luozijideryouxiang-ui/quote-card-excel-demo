export const DEFAULT_TEMPLATE_PATH = "/Users/momo/Downloads/导摄报价单模板_V5(1).xlsx";
export const OUTPUT_DIR = "/Users/momo/Desktop/02_财务表格/报价单生成工具";
export const QUOTE_RENDER_RANGE = "A1:L107";

export const SECTIONS = {
  equipment: { sheet: "报价单", start: 8, end: 66, lookup: true, cols: 12 },
  personnel: { sheet: "报价单", start: 69, end: 86, lookup: true, cols: 12 },
  reimbursement: { sheet: "报价单", start: 90, end: 93, lookup: false, cols: 12 },
};

export const CATEGORY_BLOCKS = {
  equipment: [
    { category: "摄像设备", start: 8, end: 20 },
    { category: "导播设备", start: 21, end: 32 },
    { category: "音频设备", start: 33, end: 41 },
    { category: "网络和传输设备", start: 42, end: 48 },
    { category: "通信设备", start: 49, end: 54 },
    { category: "电力设备", start: 55, end: 60 },
    { category: "其他", start: 61, end: 66 },
  ],
  personnel: [
    { category: "导播/导演组", start: 69, end: 73 },
    { category: "摄像组", start: 74, end: 79 },
    { category: "技术组", start: 80, end: 86 },
  ],
  reimbursement: [{ category: "实报实销", start: 90, end: 93 }],
};

export const EQUIPMENT_CATEGORIES = new Set(CATEGORY_BLOCKS.equipment.map((block) => block.category));
export const PERSONNEL_CATEGORIES = new Set(CATEGORY_BLOCKS.personnel.map((block) => block.category));

export function typeForCategory(category) {
  if (EQUIPMENT_CATEGORIES.has(category)) return "equipment";
  if (PERSONNEL_CATEGORIES.has(category)) return "personnel";
  if (category === "实报实销") return "reimbursement";
  return "equipment";
}
