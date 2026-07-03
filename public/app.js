const state = {
  catalog: [],
  packages: [],
  schemes: [],
  lines: [],
  priceEntries: [],
  activeTab: "全部",
  activeMode: "catalog",
  workflowMode: "quote",
  taxRate: 0.06,
  isGenerating: false,
};

const typeLabels = {
  equipment: "设备",
  personnel: "人员",
  reimbursement: "实报实销",
};

const sourceLabels = {
  catalog: "目录",
  package: "套餐",
  import: "导入",
  custom: "自定义",
};

const refs = {
  tabs: document.querySelector("#tabs"),
  cardGrid: document.querySelector("#cardGrid"),
  selectedRows: document.querySelector("#selectedRows"),
  estimatedTotal: document.querySelector("#estimatedTotal"),
  taxExclusiveTotal: document.querySelector("#taxExclusiveTotal"),
  taxAmount: document.querySelector("#taxAmount"),
  taxInclusiveTotal: document.querySelector("#taxInclusiveTotal"),
  taxRateText: document.querySelector("#taxRateText"),
  status: document.querySelector("#status"),
  generateBtn: document.querySelector("#generateBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  saveSchemeBtn: document.querySelector("#saveSchemeBtn"),
  rehearsalTime: document.querySelector("#rehearsalTime"),
  liveTime: document.querySelector("#liveTime"),
  estimateModeBtn: document.querySelector("#estimateModeBtn"),
  quoteModeBtn: document.querySelector("#quoteModeBtn"),
  catalogModeBtn: document.querySelector("#catalogModeBtn"),
  packageModeBtn: document.querySelector("#packageModeBtn"),
  schemeModeBtn: document.querySelector("#schemeModeBtn"),
};

init();

async function init() {
  wireEvents();
  try {
    const [catalogData, packageData, schemeData, priceData] = await Promise.all([
      fetchJson("/api/catalog"),
      fetchJson("/api/packages"),
      fetchJson("/api/schemes"),
      fetchJson("/api/price/list"),
    ]);
    state.catalog = catalogData.catalog || [];
    state.packages = packageData.packages || [];
    state.schemes = schemeData.schemes || [];
    state.priceEntries = priceData.entries || [];
    render();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function wireEvents() {
  refs.generateBtn.addEventListener("click", generateExcel);
  refs.clearBtn.addEventListener("click", () => {
    state.lines = [];
    setStatus("");
    render();
  });
  refs.saveSchemeBtn.addEventListener("click", saveCurrentScheme);
  refs.catalogModeBtn.addEventListener("click", () => {
    state.activeMode = "catalog";
    setStatus("");
    render();
  });
  refs.packageModeBtn.addEventListener("click", () => {
    state.activeMode = "packages";
    setStatus("");
    render();
  });
  refs.schemeModeBtn.addEventListener("click", () => {
    state.activeMode = "schemes";
    setStatus("");
    render();
  });
  refs.rehearsalTime.addEventListener("change", () => {
    applyRehearsalDateDefaults();
    render();
  });
  refs.estimateModeBtn.addEventListener("click", () => {
    state.workflowMode = "estimate";
    setStatus("估价模式只计算价格，不生成 Excel。");
    render();
  });
  refs.quoteModeBtn.addEventListener("click", () => {
    state.workflowMode = "quote";
    setStatus("");
    render();
  });
}

function render() {
  renderWorkflowMode();
  renderModeButtons();
  renderTabs();
  if (state.activeMode === "schemes") {
    renderSchemeCards();
  } else if (state.activeMode === "packages") {
    renderPackageCards();
  } else {
    renderCatalogCards();
  }
  renderQuoteRows();
  renderEstimatedTotal();
}

function renderWorkflowMode() {
  refs.estimateModeBtn.classList.toggle("active", state.workflowMode === "estimate");
  refs.quoteModeBtn.classList.toggle("active", state.workflowMode === "quote");
  refs.generateBtn.textContent = state.workflowMode === "quote" ? "生成 Excel" : "切到报价模式出表";
  refs.generateBtn.classList.toggle("secondary-action", state.workflowMode === "estimate");
}

function renderModeButtons() {
  refs.catalogModeBtn.classList.toggle("active", state.activeMode === "catalog");
  refs.packageModeBtn.classList.toggle("active", state.activeMode === "packages");
  refs.schemeModeBtn.classList.toggle("active", state.activeMode === "schemes");
}

function renderTabs() {
  refs.tabs.innerHTML = "";
  refs.tabs.hidden = state.activeMode !== "catalog";
  if (state.activeMode !== "catalog") return;

  const categoryTabs = [
    "全部",
    ...new Set(state.catalog.map((item) => item.category || typeLabels[item.type] || "其他")),
  ];

  for (const tab of categoryTabs) {
    const button = document.createElement("button");
    button.className = `tab${state.activeTab === tab ? " active" : ""}`;
    button.type = "button";
    button.textContent = tab;
    button.addEventListener("click", () => {
      state.activeTab = tab;
      render();
    });
    refs.tabs.append(button);
  }
}

function renderSchemeCards() {
  refs.cardGrid.innerHTML = "";
  if (!state.schemes.length) {
    refs.cardGrid.innerHTML = '<div class="empty wide-empty">还没有方案。导入报价单或保存当前明细后会出现在这里。</div>';
    return;
  }

  for (const item of state.schemes) {
    const card = document.createElement("button");
    card.className = "card package-card scheme-card";
    card.type = "button";
    card.addEventListener("click", () => {
      loadSchemeLines(item);
      render();
    });
    const label = item.source === "import" ? "历史报价" : "常用方案";
    card.innerHTML = `
      <div class="card-type">
        <span>${escapeHtml(label)}</span>
        <span class="count-badge">${Number(item.lineCount || item.lines?.length || 0)}</span>
      </div>
      <div>
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-model">${escapeHtml(formatSchemeDate(item.createdAt))}</div>
      </div>
      <div class="package-items">${escapeHtml((item.lines || []).slice(0, 5).map((line) => line.name).join(" / "))}</div>
    `;
    refs.cardGrid.append(card);
  }
}

function renderCatalogCards() {
  refs.cardGrid.innerHTML = "";
  const visible = state.catalog.filter((item) => {
    if (state.activeTab === "全部") return true;
    return (item.category || typeLabels[item.type]) === state.activeTab;
  });

  for (const item of visible) {
    const count = countProduct(item.id);
    const card = document.createElement("article");
    card.className = `card${count ? " active-card" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `添加 ${item.name}`);
    card.addEventListener("click", () => {
      changeProductQuantity(item, 1, { source: "catalog" });
      setStatus("");
      render();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      changeProductQuantity(item, 1, { source: "catalog" });
      setStatus("");
      render();
    });
    card.innerHTML = `
      <div class="card-type">
        <span>${escapeHtml(item.category || typeLabels[item.type])}</span>
        <span class="count-badge">${count || "+"}</span>
      </div>
      <div>
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-model">${escapeHtml(item.model || item.provider || "")}</div>
      </div>
      <div class="card-foot">
        <span>${escapeHtml(typeLabels[item.type])}</span>
        <strong>${escapeHtml(item.isAnnualFrame ? "年框" : "外部")}</strong>
      </div>
      <div class="card-controls" aria-label="调整数量">
        <button class="card-step" data-card-step="-1" type="button" aria-label="减少 ${escapeAttribute(item.name)} 数量">-</button>
        <button class="card-step add-step" data-card-step="1" type="button" aria-label="增加 ${escapeAttribute(item.name)} 数量">+</button>
      </div>
    `;
    card.querySelectorAll("[data-card-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        changeProductQuantity(item, Number(button.dataset.cardStep || 0), { source: "catalog" });
        setStatus("");
        render();
      });
    });
    refs.cardGrid.append(card);
  }
}

function renderPackageCards() {
  refs.cardGrid.innerHTML = "";
  for (const item of state.packages) {
    const products = item.items
      .map((packageItem) => state.catalog.find((product) => product.id === packageItem.productId))
      .filter(Boolean);
    const card = document.createElement("button");
    card.className = "card package-card";
    card.type = "button";
    card.addEventListener("click", () => {
      addPackageLines(item);
      render();
    });
    card.innerHTML = `
      <div class="card-type">
        <span>场景套餐</span>
        <span class="count-badge">+</span>
      </div>
      <div>
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-model">${products.length} 个项目，可展开编辑</div>
      </div>
      <div class="package-items">${escapeHtml(products.slice(0, 5).map((product) => product.name).join(" / "))}</div>
    `;
    refs.cardGrid.append(card);
  }
}

function renderQuoteRows() {
  refs.selectedRows.innerHTML = "";
  if (!state.lines.length) {
    refs.selectedRows.innerHTML = '<div class="empty">点击左侧卡片或套餐后，项目会进入这里。</div>';
    return;
  }

  const table = document.createElement("div");
  table.className = "quote-table";
  table.innerHTML = `
    <div class="quote-table-head">
      <span>名称</span>
      <span>直播数量</span>
      <span>直播天数</span>
      <span>彩排数量</span>
      <span>彩排天数</span>
      <span>供应商</span>
      <span>备注</span>
      <span>来源</span>
      <span></span>
    </div>
  `;

  for (const line of state.lines) {
    const row = document.createElement("div");
    row.className = "quote-row";
    const providerOptions = providerOptionsForLine(line);
    row.innerHTML = `
      <div class="quote-name">
        <strong>${escapeHtml(line.name)}</strong>
        <span>${escapeHtml(line.category || typeLabels[line.type] || "")}</span>
      </div>
      <div class="stepper">
        <button class="mini-button" data-step="-1" data-id="${line.lineId}" type="button" aria-label="减少数量">-</button>
        <input data-field="quantity" data-id="${line.lineId}" type="number" min="0" step="1" value="${line.quantity}" aria-label="数量" />
        <button class="mini-button" data-step="1" data-id="${line.lineId}" type="button" aria-label="增加数量">+</button>
      </div>
      <input data-field="days" data-id="${line.lineId}" type="number" min="0" step="1" value="${line.days}" aria-label="天数" />
      <input data-field="rehearsalQuantity" data-id="${line.lineId}" type="number" min="0" step="1" value="${line.rehearsalQuantity || 0}" aria-label="彩排数量" />
      <input data-field="rehearsalDays" data-id="${line.lineId}" type="number" min="0" step="1" value="${line.rehearsalDays || 0}" aria-label="彩排天数" />
      <select class="provider-select" data-field="provider" data-id="${line.lineId}" aria-label="供应商">
        ${providerOptions
          .map(
            (provider) =>
              `<option value="${escapeAttribute(provider)}"${provider === line.provider ? " selected" : ""}>${escapeHtml(provider)}</option>`,
          )
          .join("")}
      </select>
      <input class="remark-input" data-field="remark" data-id="${line.lineId}" value="${escapeAttribute(line.remark || "")}" aria-label="备注" />
      <span class="source-pill">${escapeHtml(sourceLabels[line.source] || line.source)}</span>
      <button class="mini-button danger-button" data-remove="${line.lineId}" type="button" aria-label="删除">×</button>
    `;
    table.append(row);
  }

  refs.selectedRows.append(table);
  bindQuoteRowEvents();
}

function bindQuoteRowEvents() {
  refs.selectedRows.querySelectorAll("input[data-field], select[data-field]").forEach((control) => {
    control.addEventListener("input", () => {
      const field = control.dataset.field;
      updateLine(control.dataset.id, {
        [field]: control.type === "number" ? Number(control.value || 0) : control.value,
      });
      renderEstimatedTotal();
    });
  });

  refs.selectedRows.querySelectorAll("button[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const amount = Number(button.dataset.step || 0);
      const line = findLine(button.dataset.id);
      if (!line) return;
      const nextQuantity = Math.max(0, Number(line.quantity || 0) + amount);
      if (nextQuantity === 0) {
        state.lines = state.lines.filter((item) => item.lineId !== line.lineId);
      } else {
        updateLine(line.lineId, { quantity: nextQuantity });
      }
      render();
    });
  });

  refs.selectedRows.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.lines = state.lines.filter((line) => line.lineId !== button.dataset.remove);
      render();
    });
  });
}

function addProductLine(product, options = {}) {
  const existing = state.lines.find((line) => line.productId === product.id);
  if (existing) {
    existing.quantity = Number(existing.quantity || 0) + Number(options.quantity || 1);
    existing.days = Math.max(Number(existing.days || 1), Number(options.days || 1));
    existing.rehearsalQuantity = Math.max(
      Number(existing.rehearsalQuantity || 0),
      Number(options.rehearsalQuantity || 0),
    );
    existing.rehearsalDays = Math.max(Number(existing.rehearsalDays || 0), Number(options.rehearsalDays || 0));
    return;
  }
  state.lines.push(createClientLine(product, options));
}

function changeProductQuantity(product, amount, options = {}) {
  const existing = state.lines.find((line) => line.productId === product.id);
  if (amount > 0) {
    addProductLine(product, { ...options, quantity: amount });
    return;
  }
  if (!existing) return;
  const nextQuantity = Math.max(0, Number(existing.quantity || 0) + amount);
  if (nextQuantity === 0) {
    state.lines = state.lines.filter((line) => line.lineId !== existing.lineId);
  } else {
    existing.quantity = nextQuantity;
  }
}

function addPackageLines(packageConfig) {
  let added = 0;
  for (const item of packageConfig.items || []) {
    const product = state.catalog.find((entry) => entry.id === item.productId);
    if (!product) continue;
    addProductLine(product, {
      quantity: item.quantity ?? 1,
      days: item.days ?? 1,
      rehearsalQuantity: item.rehearsalQuantity ?? 0,
      rehearsalDays: item.rehearsalDays ?? 0,
      source: "package",
    });
    added += 1;
  }
  setStatus(`已展开套餐：${packageConfig.name}，加入 ${added} 项。`, "success");
}

function loadSchemeLines(scheme) {
  state.lines = (scheme.lines || []).map((line) =>
    normalizeClientLine({
      ...line,
      lineId: makeLineId(line.productId || line.name || "scheme"),
      source: scheme.source === "import" ? "import" : "custom",
    }),
  );
  applyRehearsalDateDefaults();
  setStatus(`已套用方案：${scheme.name}，载入 ${state.lines.length} 项。`, "success");
}

async function saveCurrentScheme() {
  if (!state.lines.length) {
    setStatus("当前没有可保存的报价明细。", "error");
    return;
  }

  const name = document.querySelector("#projectName").value.trim() || "常用方案";
  try {
    const data = await fetchJson("/api/schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lines: state.lines }),
    });
    state.schemes = data.schemes || [];
    state.activeMode = "schemes";
    setStatus(`已保存方案：${data.scheme?.name || name}`, "success");
    render();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function createClientLine(product, options = {}) {
  const quantity = Number(options.quantity ?? 1);
  return {
    lineId: makeLineId(product.id),
    productId: product.id,
    type: product.type || "equipment",
    category: product.category || "",
    name: product.name || "",
    model: product.model || "",
    quantity,
    days: Number(options.days ?? 1),
    rehearsalQuantity: Number(options.rehearsalQuantity ?? (hasRehearsalDate() ? quantity : 0)),
    rehearsalDays: Number(options.rehearsalDays ?? (hasRehearsalDate() ? 1 : 0)),
    remark: options.remark || "",
    provider: product.provider || "",
    isAnnualFrame: Boolean(options.isAnnualFrame ?? product.isAnnualFrame),
    source: options.source || "catalog",
  };
}

function applyRehearsalDateDefaults() {
  if (!hasRehearsalDate()) return;
  for (const line of state.lines) {
    if (Number(line.rehearsalQuantity || 0) === 0) {
      line.rehearsalQuantity = Number(line.quantity || 1);
    }
    if (Number(line.rehearsalDays || 0) === 0) {
      line.rehearsalDays = 1;
    }
  }
  if (state.lines.length) setStatus("已按彩排日期自动补 1 天彩排。", "success");
}

function hasRehearsalDate() {
  return Boolean(refs.rehearsalTime.value);
}

async function generateExcel() {
  if (state.workflowMode !== "quote") {
    setStatus("当前是估价模式：只显示含税/不含税预估。切到报价模式后再生成 Excel。", "error");
    return;
  }
  if (!state.lines.length) {
    setStatus("请先添加至少一个报价项目。", "error");
    return;
  }

  state.isGenerating = true;
  refs.generateBtn.disabled = true;
  setStatus("正在生成 Excel...");

  try {
    const response = await fetch(apiUrl("/api/generate-download"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: getProject(),
        lines: state.lines,
      }),
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));

    const blob = await response.blob();
    const fileName = getDownloadFileName(response.headers.get("Content-Disposition"));
    downloadBlob(blob, fileName);

    const formulaIssueCount = Number(response.headers.get("X-Quote-Formula-Issues") || 0);
    const outputPath = decodeHeaderValue(response.headers.get("X-Quote-Output-Path"));
    const issueText = formulaIssueCount
      ? `；公式检查发现 ${formulaIssueCount} 个问题`
      : "；公式检查未发现错误";
    const savedText = outputPath ? `；桌面已留存：${outputPath}` : "";
    setStatus(`已触发浏览器下载：${fileName}${savedText}${issueText}`, formulaIssueCount ? "error" : "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    state.isGenerating = false;
    refs.generateBtn.disabled = false;
  }
}

function renderEstimatedTotal() {
  const totals = calculateTotals();
  refs.taxExclusiveTotal.textContent = formatCurrency(totals.taxExclusiveTotal);
  refs.taxAmount.textContent = formatCurrency(totals.taxAmount);
  refs.taxInclusiveTotal.textContent = formatCurrency(totals.taxInclusiveTotal);
  refs.taxRateText.textContent = `${Math.round(totals.taxRate * 100)}%`;
  if (refs.estimatedTotal) refs.estimatedTotal.textContent = formatCurrency(totals.taxExclusiveTotal);
}

function calculateTotals() {
  let taxExclusiveTotal = 0;
  for (const line of state.lines) {
    const price = resolveLinePrice(line);
    const liveUnits = Number(line.quantity || 0) * Number(line.days || 0);
    const rehearsalUnits = Number(line.rehearsalQuantity || 0) * Number(line.rehearsalDays || 0);
    taxExclusiveTotal += price * (liveUnits + rehearsalUnits);
  }
  const taxAmount = roundCurrency(taxExclusiveTotal * state.taxRate);
  return {
    taxExclusiveTotal: roundCurrency(taxExclusiveTotal),
    taxRate: state.taxRate,
    taxAmount,
    taxInclusiveTotal: roundCurrency(taxExclusiveTotal + taxAmount),
  };
}

function resolveLinePrice(line) {
  const entry = state.priceEntries.find((item) => item.productId === line.productId);
  if (!entry) return 0;
  const providerPrice = chooseProviderPrice(entry, line);
  if (providerPrice !== null) return providerPrice;
  const annual = nullableNumber(entry.price?.annual);
  const standard = nullableNumber(entry.price?.standard);
  if (line.isAnnualFrame && annual !== null) return annual;
  return standard ?? 0;
}

function providerOptionsForLine(line) {
  const entry = state.priceEntries.find((item) => item.productId === line.productId);
  const providers = new Set();
  if (line.provider) providers.add(line.provider);
  for (const item of entry?.providerPrices || []) {
    if (item.provider) providers.add(item.provider);
  }
  if (!providers.size) providers.add("供应商");
  return [...providers];
}

function chooseProviderPrice(entry, line) {
  const provider = normalizeProviderName(line.provider);
  if (!provider) return null;
  const option = (entry.providerPrices || []).find((item) => normalizeProviderName(item.provider) === provider);
  if (!option) return null;
  const annual = nullableNumber(option.annual);
  const standard = nullableNumber(option.standard);
  if (line.isAnnualFrame && annual !== null) return annual;
  return standard ?? annual;
}

async function fetchJson(path, options) {
  const response = await fetch(apiUrl(path), options);
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "接口请求失败");
  return data;
}

function updateLine(lineId, patch) {
  const line = findLine(lineId);
  if (!line) return;
  Object.assign(line, patch);
}

function findLine(lineId) {
  return state.lines.find((line) => line.lineId === lineId);
}

function countProduct(productId) {
  return state.lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

function normalizeClientLine(line) {
  return {
    lineId: line.lineId || makeLineId(line.productId || line.name || "line"),
    productId: line.productId || "",
    type: line.type || "equipment",
    category: line.category || "",
    name: line.name || "",
    model: line.model || "",
    quantity: Number(line.quantity ?? 1),
    days: Number(line.days ?? 1),
    rehearsalQuantity: Number(line.rehearsalQuantity ?? 0),
    rehearsalDays: Number(line.rehearsalDays ?? 0),
    remark: line.remark || "",
    provider: line.provider || "",
    isAnnualFrame: Boolean(line.isAnnualFrame),
    source: line.source || "import",
  };
}

function formatSchemeDate(value) {
  if (!value) return "";
  return String(value).replace("T", " ").replace("+08:00", "");
}

function makeLineId(seed) {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const safeSeed = String(seed || "line").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 24);
  return `line_${safeSeed}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "报价单.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getDownloadFileName(contentDisposition) {
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) return decodeURIComponent(encodedMatch[1]);

  const quotedMatch = contentDisposition?.match(/filename="([^"]+)"/i);
  if (quotedMatch) return quotedMatch[1];

  return "报价单.xlsx";
}

function decodeHeaderValue(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.error || "请求失败";
  }
  return (await response.text()) || "请求失败";
}

function getProject() {
  return {
    projectName: document.querySelector("#projectName").value,
    brand: document.querySelector("#brand").value,
    location: document.querySelector("#location").value,
    rehearsalTime: formatDateForQuote(refs.rehearsalTime.value),
    liveTime: formatDateForQuote(refs.liveTime.value),
    contact: document.querySelector("#contact").value,
  };
}

function formatDateForQuote(value) {
  return value ? value.replaceAll("-", ".") : "";
}

function apiUrl(path) {
  const base = window.__QUOTE_API_BASE__ || "";
  return `${base}${path}`;
}

function setStatus(message, tone = "") {
  refs.status.textContent = message;
  refs.status.className = `status ${tone}`.trim();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeProviderName(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
