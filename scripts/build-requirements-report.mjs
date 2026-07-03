import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const workspaceOutput = path.join(rootDir, "outputs", "报价单生成工具_需求技术打包_20260702.txt");
const desktopOutput = path.join(
  "/Users/momo/Desktop/02_财务表格/报价单生成工具",
  "报价单生成工具_需求技术打包_20260702.txt",
);
const templatePath = "/Users/momo/Downloads/导摄报价单模板_V5(1).xlsx";

const sourceFiles = [
  "package.json",
  "data/products.json",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "src/excelGenerator.mjs",
  "src/quoteModel.mjs",
  "src/server.mjs",
  "src/httpHeaders.mjs",
  "src/staticFiles.mjs",
  "src/standaloneHtml.mjs",
  "scripts/build-standalone-html.mjs",
  "test/browserDownload.test.mjs",
  "test/excelGenerator.test.mjs",
  "test/httpHeaders.test.mjs",
  "test/quoteModel.test.mjs",
  "test/standaloneHtml.test.mjs",
  "test/staticFiles.test.mjs",
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
const templateSummary = await inspectTemplate(workbook);
const catalogGroups = extractCatalogGroups(workbook);
const testResult = await runTests();
const sourceBundle = await readSourceBundle();

const report = [
  "报价单快速生成工具：需求、技术、Schema 打包文件",
  "生成日期：2026-07-02",
  "用途：给其他大模型/工程师继续分析和规划，不是最终产品说明书。",
  "",
  "============================================================",
  "1. 用户目标汇总",
  "============================================================",
  "",
  "- 用户有大量报价单和模板，希望把报价流程做成快速点击式工具。",
  "- 第一版希望通过网页卡片选择设备/人员/实报实销项目，点击一次代表一台/一项，点两次代表两台。",
  "- 生成结果必须基于用户的标准 Excel 模板，并确保公式正确。",
  "- 用户确认标准模板为：/Users/momo/Downloads/导摄报价单模板_V5(1).xlsx。",
  "- 当前版本已实现：本地网页 + Node 服务 + V5 模板生成 + 浏览器下载 .xlsx + 桌面留存。",
  "- 新需求：",
  "  1) 表格/报价明细要可编辑。",
  "  2) 设备要支持增加、减少。",
  "  3) 增加设备套餐，一键加入多项设备/人员。",
  "  4) 设备库要来自模板里的“年框+自有设备清单”，不要只用手写的少量设备。",
  "  5) 现在先去掉价格逻辑，价格/估价下个版本再做。",
  "  6) 检查当前生成逻辑是否有问题。",
  "  7) 增加导入既有报价单功能，提取其中的设备信息。",
  "  8) 下个版本以后，设备希望用图片方式展示以便更快查找。",
  "  9) 本文件需要汇总需求、方案、schema、当前文件和逻辑，作为文本文件交给大模型分析。",
  "",
  "============================================================",
  "2. 当前工程状态",
  "============================================================",
  "",
  `工作区工程：${rootDir}`,
  "桌面工程：/Users/momo/Desktop/02_财务表格/报价单生成工具/quote-card-excel-demo",
  "桌面 HTML：/Users/momo/Desktop/02_财务表格/报价单生成工具/报价单快速生成器.html",
  "本地服务：http://127.0.0.1:4173/",
  `模板文件：${templatePath}`,
  "",
  "当前主要能力：",
  "- GET /api/catalog：返回 data/products.json 中的卡片目录。",
  "- POST /api/generate-download：根据选择生成 Excel，响应为浏览器下载附件。",
  "- 生成时同时保存到桌面目录，并生成 PNG 预览。",
  "- 生成器会扫描公式错误：#REF!、#DIV/0!、#VALUE!、#NAME?、#N/A。",
  "- 当前测试覆盖 16 条，包括 V5 区间、下载响应头、分类块落位、容量限制、静态文件安全等。",
  "",
  "当前测试结果：",
  fence("text", testResult.trim()),
  "",
  "============================================================",
  "3. V5 模板结构摘要",
  "============================================================",
  "",
  templateSummary,
  "",
  "============================================================",
  "4. 从模板清单页读取到的全量设备/人员名称",
  "============================================================",
  "",
  formatCatalogGroups(catalogGroups),
  "",
  "============================================================",
  "5. 当前生成逻辑检查",
  "============================================================",
  "",
  "结论：第一版生成逻辑能稳定生成 V5 样式报价单，但不满足新需求，下一版必须调整数据源、编辑模型和价格逻辑。",
  "",
  "已确认可用的点：",
  "- V5 模板路径已固定为导摄报价单模板_V5(1).xlsx。",
  "- 报价单主 sheet 使用 A1:L107。",
  "- 设备区：8-66；人员区：69-86；实报实销：90-93。",
  "- 固定分类块已保留，例如 A8:A20、A21:A32、A42:A48、A69:A73、A90:A93。",
  "- 空行公式已做 IF 防护，生成样张公式错误扫描为 0。",
  "- 浏览器下载接口返回 Excel MIME 和 Content-Disposition 附件名。",
  "",
  "主要问题/风险：",
  "- 当前 data/products.json 只有 39 个手工维护项目，远少于模板清单页的 165 个左右设备/人员项。",
  "- 当前 schema 仍包含 unitPrice，前端也显示单价、预估税前合计；这与“现在先去掉价格”冲突。",
  "- 当前 Excel 写入仍填 D 列单价为 0，并计算 H/K/汇总金额；如果下版去价格，应改为空白可填或暂不展示金额。",
  "- 当前报价单主模板固定行数有限：设备 59 行、人员 18 行、实报实销 4 行；全量设备库可以存在，但一次报价选择超过模板容量会失败。",
  "- 当前前端已选区不是完整表格，只能改单价、数量、天数、备注；不支持拖拽排序、插入自定义行、批量增减、套餐展开后逐项编辑。",
  "- 当前生成器按固定模板分类块落位，适合保持 V5 样式，但如果用户选择某分类超过该分类块容量，会报错。",
  "- 当前导入已有报价单功能不存在。",
  "- 当前不支持设备图片、搜索别名、拼音/英文快速检索。",
  "- 当前“是否年框/提供方”依赖 Excel VLOOKUP；前端没有直接展示这些字段。",
  "",
  "建议下一版原则：",
  "- 保留服务端生成 Excel，因为它最容易保留模板样式、公式、合并单元格和浏览器下载。",
  "- 卡片/设备目录改为从模板 sheet 自动抽取，避免 JSON 手工漏项。",
  "- 去价格不是删除 Excel 公式，而是把价格字段变成“空白可填”，UI 不显示报价金额，生成时金额列留给用户后续手填或自动估价版本再接管。",
  "- 先把“选项和数量”做对，再做估价。",
  "",
  "============================================================",
  "6. 推荐技术方案",
  "============================================================",
  "",
  "推荐方案 A：继续用本地 Node 服务作为生成内核，前端网页做可编辑报价工作台。",
  "- 优点：最稳，能保留 Excel 模板格式和公式；适合导入已有报价单、解析模板清单、生成浏览器下载。",
  "- 缺点：仍需要本地服务运行，不是纯静态 HTML。",
  "- 适合现在继续推进。",
  "",
  "备选方案 B：纯浏览器 HTML + 客户端 xlsx 库。",
  "- 优点：不依赖本地服务。",
  "- 缺点：复杂 Excel 样式、合并单元格、公式、模板保真和本地文件写入都更难；导入/导出可靠性较差。",
  "- 不推荐用于当前 V5 模板。",
  "",
  "备选方案 C：做成桌面 App（Electron/Tauri）或 WPS/Excel 插件。",
  "- 优点：体验更像软件，可直接管理本地模板、图片库、历史报价。",
  "- 缺点：开发和打包成本更高。",
  "- 适合作为第三阶段。",
  "",
  "推荐下一步：用方案 A 做第二版。先完成设备库全量化、可编辑明细、套餐、导入报价单、去价格显示。估价和图片库作为第三版。",
  "",
  "============================================================",
  "7. 第二版功能设计",
  "============================================================",
  "",
  "7.1 可编辑报价明细",
  "- 左侧为设备库/人员库/实报实销/套餐。",
  "- 右侧为“报价单明细表格”，每行可编辑：名称、型号、数量、天数、备注、提供方、是否年框、现场确认。",
  "- 行操作：增加一行、删除一行、复制一行、数量 +1/-1、拖拽排序或上移/下移。",
  "- 支持自定义设备行，避免模板清单没有的新设备无法写入。",
  "",
  "7.2 全量设备库",
  "- 设备库从模板“年框+自有设备清单”读取。",
  "- 读取字段：分类、名称、是否年框、提供方；后续可补图片、别名、标签。",
  "- 前端显示按分类 tabs + 搜索框 + 收藏/常用。",
  "- 不在第二版维护价格。",
  "",
  "7.3 设备套餐",
  "- 套餐是多个 line item 的集合。",
  "- 点击套餐后，把套餐内设备/人员逐行加入已选明细。",
  "- 套餐展开后仍可编辑每个单项数量、天数、备注，避免套餐变成不可调整黑盒。",
  "- 套餐先用 JSON/配置文件维护，之后可以做 UI 保存套餐。",
  "",
  "7.4 去掉价格逻辑",
  "- 前端隐藏单价、预估税前合计和金额展示。",
  "- 生成 Excel 时 D 列单价可以留空，H/K/汇总公式保留但因单价为空显示空白或 0；推荐把明细行公式保留，避免用户填单价后 Excel 自动计算。",
  "- 导出后用户可直接在 Excel 中填价格；下个估价版本再由规则/模型填价格。",
  "",
  "7.5 导入已有报价单",
  "- 上传/选择一个已做好的 .xlsx。",
  "- 后端读取“报价单”sheet 的 A1:L107。",
  "- 按固定区间解析：设备 8-66、人员 69-86、实报实销 90-93。",
  "- 读取非空名称行，提取分类、名称、型号、数量、天数、备注、提供方、是否年框。",
  "- 匹配到设备库的返回 catalogId；未匹配的标记为 custom/manual。",
  "- 前端展示为可编辑明细，用户可以继续增减后再导出。",
  "",
  "7.6 图片化设备查找（后续版本）",
  "- Product 增加 imagePath、thumbnailPath、tags、aliases。",
  "- 设备卡片显示缩略图；支持按分类、搜索、常用、最近使用过滤。",
  "- 图片库可先用本地文件夹映射：/assets/devices/{slug}.jpg。",
  "",
  "============================================================",
  "8. 建议数据 Schema",
  "============================================================",
  "",
  "8.1 当前 catalog item schema（现状，仍含价格字段）",
  fence(
    "json",
    JSON.stringify(
      {
        id: "eq-camera-fx3",
        type: "equipment | personnel | reimbursement",
        category: "摄像设备",
        name: "Sony ILME-FX3",
        model: "Sony ILME-FX3",
        unitPrice: 0,
        officialDays: 1,
        provider: "RMM",
        remark: "",
      },
      null,
      2,
    ),
  ),
  "",
  "8.2 第二版推荐 Product schema（去价格）",
  fence(
    "json",
    JSON.stringify(
      {
        id: "product_sony_ilme_fx3",
        type: "equipment",
        category: "摄像设备",
        name: "Sony ILME-FX3",
        model: "",
        isAnnualFrame: true,
        provider: "RMM",
        aliases: ["FX3", "索尼FX3"],
        tags: ["camera", "sony"],
        imagePath: "",
        source: {
          workbook: "导摄报价单模板_V5(1).xlsx",
          sheet: "年框+自有设备清单",
          row: 3,
        },
      },
      null,
      2,
    ),
  ),
  "",
  "8.3 第二版推荐 QuoteLine schema",
  fence(
    "json",
    JSON.stringify(
      {
        lineId: "line_001",
        productId: "product_sony_ilme_fx3",
        type: "equipment",
        category: "摄像设备",
        name: "Sony ILME-FX3",
        model: "",
        rehearsalQuantity: 0,
        officialQuantity: 2,
        officialDays: 1,
        provider: "RMM",
        isAnnualFrame: true,
        remark: "可手动编辑",
        source: "catalog | package | imported | custom",
        packageId: null,
      },
      null,
      2,
    ),
  ),
  "",
  "8.4 第二版推荐 QuoteProject schema",
  fence(
    "json",
    JSON.stringify(
      {
        projectName: "上海w品牌直播活动",
        brand: "w",
        location: "容么么直播中心",
        rehearsalTime: "2026.07.06",
        liveTime: "2026.07.07&09",
        contact: "梦圆",
        lines: [],
      },
      null,
      2,
    ),
  ),
  "",
  "8.5 第二版推荐 Package schema",
  fence(
    "json",
    JSON.stringify(
      {
        packageId: "pkg_basic_live_4cam",
        name: "4机位基础直播套餐",
        description: "导播台 + 4台摄像机 + 基础音频 + 导播/摄像人员",
        items: [
          {
            productId: "product_sony_ilme_fx3",
            officialQuantity: 4,
            officialDays: 1,
            remark: "",
          },
          {
            productId: "product_atem_constellation_8k",
            officialQuantity: 1,
            officialDays: 1,
            remark: "",
          },
        ],
      },
      null,
      2,
    ),
  ),
  "",
  "8.6 导入报价单结果 schema",
  fence(
    "json",
    JSON.stringify(
      {
        ok: true,
        sourceFileName: "客户已有报价单.xlsx",
        project: {
          projectName: "项目名称",
          brand: "品牌方",
          location: "执行地点",
        },
        lines: [
          {
            lineId: "imported_001",
            matchedProductId: "product_sony_ilme_fx3",
            matchConfidence: 1,
            type: "equipment",
            category: "摄像设备",
            name: "Sony ILME-FX3",
            model: "",
            officialQuantity: 2,
            officialDays: 1,
            provider: "RMM",
            isAnnualFrame: true,
            remark: "",
          },
        ],
        unmatchedLines: [],
        warnings: [],
      },
      null,
      2,
    ),
  ),
  "",
  "============================================================",
  "9. 建议 API / 模块边界",
  "============================================================",
  "",
  "API：",
  "- GET /api/catalog：从模板清单或缓存返回全量设备/人员库。",
  "- GET /api/packages：返回套餐配置。",
  "- POST /api/import-quote：上传/传入已有报价单，返回可编辑 lines。",
  "- POST /api/generate-download：输入 project + lines，返回 .xlsx 下载。",
  "- POST /api/preview：可选，返回解析后的预览/校验结果。",
  "",
  "模块：",
  "- catalogExtractor：读取模板“年框+自有设备清单”，生成 Product[]。",
  "- quoteParser：从已有报价单解析 QuoteLine[]。",
  "- quoteModel：规范化项目、行、套餐展开、容量校验。",
  "- excelGenerator：只负责把 QuoteProject 写入 V5 Excel 模板。",
  "- packageModel：套餐定义、套餐展开、套餐标记。",
  "- static/server：浏览器 UI 和下载接口。",
  "",
  "============================================================",
  "10. 下一版实施顺序建议",
  "============================================================",
  "",
  "Phase 1：数据源修正",
  "- 增加 catalogExtractor，从模板读取全量设备/人员。",
  "- 前端 catalog 改为调用模板提取结果。",
  "- 删除/废弃手工 products.json 作为主数据源，最多保留本地扩展字段如图片、别名。",
  "",
  "Phase 2：去价格和可编辑明细",
  "- 前端隐藏价格和预估总价。",
  "- 右侧已选区改为真正可编辑表格。",
  "- 支持行级新增、删除、复制、数量 +/-。",
  "- 生成 Excel 时价格列留空或不写 0。",
  "",
  "Phase 3：套餐",
  "- 定义 packages.json。",
  "- 前端增加“套餐”tab。",
  "- 点击套餐展开为多条 QuoteLine，可继续编辑。",
  "",
  "Phase 4：导入已有报价单",
  "- 新增上传控件。",
  "- 后端读取 Excel 并解析报价单固定区域。",
  "- 匹配设备库，未匹配项作为自定义行。",
  "",
  "Phase 5：图片化设备库",
  "- 增加本地图片资产目录。",
  "- Product 扩展 imagePath/thumbnailPath/tags/aliases。",
  "- 前端卡片改为图文卡片，支持快速搜索。",
  "",
  "============================================================",
  "11. 给下一个大模型的建议提示词",
  "============================================================",
  "",
  "你将接手一个本地报价单快速生成工具。请先阅读本文件的需求、schema、模板结构和源码摘录。用户的核心目标是：基于 V5 Excel 模板，做一个可编辑、可导入、可套餐化、暂不估价的报价生成工具。当前第一版已经能按卡片选择项目并生成可下载 Excel，但目录不完整、仍有价格字段、不能导入既有报价单。请优先设计第二版：从模板 sheet 自动读取全量设备清单，前端提供可编辑明细表格，支持设备增减和套餐，生成时去掉价格显示并保证 Excel 模板公式/样式不坏。不要先做估价模型，价格留到后续版本。",
  "",
  "============================================================",
  "12. 当前源码打包（文本摘录）",
  "============================================================",
  "",
  sourceBundle,
  "",
].join("\n");

await fs.mkdir(path.dirname(workspaceOutput), { recursive: true });
await fs.mkdir(path.dirname(desktopOutput), { recursive: true });
await fs.writeFile(workspaceOutput, report, "utf8");
await fs.writeFile(desktopOutput, report, "utf8");

console.log(JSON.stringify({ workspaceOutput, desktopOutput }, null, 2));

async function inspectTemplate(wb) {
  const sheets = await wb.inspect({ kind: "sheet", include: "id,name", maxChars: 12000 });
  return [
    "Workbook sheets:",
    sheets.ndjson.trim(),
    "",
    "报价单主表固定区间：",
    "- 项目信息：A1:H5",
    "- 设备区：8-66；人员区：69-86；实报实销：90-93。",
    "- 设备费用标题：第 6 行；表头：第 7 行；明细：8-66；小计：67",
    "- 人员费用标题：第 68 行；明细：69-86；小计：87",
    "- 实报实销标题：第 88 行；表头：第 89 行；明细：90-93；小计：94",
    "- 各项总计：97-107",
    "",
    "清单页：年框+自有设备清单，range A1:F170；B 列是名称，C 列是是否年框。",
  ].join("\n");
}

function extractCatalogGroups(wb) {
  const sheet = wb.worksheets.getItem("年框+自有设备清单");
  const values = sheet.getRange("A3:C170").values;
  const groups = [];
  let current = null;

  for (const [categoryCell, name, annual] of values) {
    if (categoryCell) {
      current = { category: categoryCell, items: [] };
      groups.push(current);
    }
    if (!current || !name) continue;
    current.items.push({ name, annual: annual || "" });
  }

  return groups;
}

function formatCatalogGroups(groups) {
  return groups
    .map((group) => {
      const rows = group.items.map((item, index) => {
        const annual = item.annual ? ` | 是否年框: ${item.annual}` : "";
        return `${String(index + 1).padStart(2, "0")}. ${item.name}${annual}`;
      });
      return [`## ${group.category} (${group.items.length})`, ...rows].join("\n");
    })
    .join("\n\n");
}

async function runTests() {
  try {
    const testDir = path.join(rootDir, "test");
    const testFiles = (await fs.readdir(testDir))
      .filter((name) => name.endsWith(".test.mjs"))
      .sort()
      .map((name) => path.join("test", name));
    const { stdout, stderr } = await execFileAsync(
      "/Users/momo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
      ["--test", ...testFiles],
      { cwd: rootDir },
    );
    return `${stdout}${stderr}`;
  } catch (error) {
    return `${error.stdout || ""}${error.stderr || ""}`.trim() || error.message;
  }
}

async function readSourceBundle() {
  const sections = [];
  for (const relativePath of sourceFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const text = await fs.readFile(absolutePath, "utf8");
    sections.push([
      `----- FILE: ${relativePath} -----`,
      fence(languageFor(relativePath), text.trimEnd()),
    ].join("\n"));
  }
  return sections.join("\n\n");
}

function languageFor(filePath) {
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".html")) return "html";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "js";
  return "text";
}

function fence(language, text) {
  return ["```" + language, text, "```"].join("\n");
}
