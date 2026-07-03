const state = {
  catalog: [],
  entries: [],
  packages: [],
  history: [],
  catalogSearch: "",
  priceUnlocked: false,
  pricePassword: "",
};

const refs = {
  themeToggleBtn: document.querySelector("#themeToggleBtn"),
  priceLockPanel: document.querySelector("#priceLockPanel"),
  priceTools: document.querySelector("#priceTools"),
  pricePasswordInput: document.querySelector("#pricePasswordInput"),
  priceUnlockBtn: document.querySelector("#priceUnlockBtn"),
  pricePasteInput: document.querySelector("#pricePasteInput"),
  pricePasteBtn: document.querySelector("#pricePasteBtn"),
  priceFileInput: document.querySelector("#priceFileInput"),
  priceTable: document.querySelector("#priceTable"),
  quoteImportInput: document.querySelector("#quoteImportInput"),
  importSummary: document.querySelector("#importSummary"),
  importHistory: document.querySelector("#importHistory"),
  catalogSearchInput: document.querySelector("#catalogSearchInput"),
  catalogTable: document.querySelector("#catalogTable"),
  packageJsonInput: document.querySelector("#packageJsonInput"),
  packageSaveBtn: document.querySelector("#packageSaveBtn"),
  settingsStatus: document.querySelector("#settingsStatus"),
};

init();

async function init() {
  wireEvents();
  applySavedTheme();
  restorePriceUnlock();
  await refreshAll();
}

function wireEvents() {
  refs.themeToggleBtn.addEventListener("click", toggleTheme);
  refs.priceUnlockBtn.addEventListener("click", unlockPrices);
  refs.pricePasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockPrices();
  });
  refs.pricePasteBtn.addEventListener("click", importPastedPrices);
  refs.priceFileInput.addEventListener("change", importPriceFile);
  refs.quoteImportInput.addEventListener("change", importQuoteFile);
  refs.catalogSearchInput.addEventListener("input", () => {
    state.catalogSearch = refs.catalogSearchInput.value.trim();
    renderCatalog();
  });
  refs.packageSaveBtn.addEventListener("click", savePackages);
}

async function refreshAll() {
  try {
    const [catalogData, packageData, historyData] = await Promise.all([
      fetchJson("/api/catalog"),
      fetchJson("/api/packages"),
      fetchJson("/api/import-history"),
    ]);
    state.catalog = catalogData.catalog || [];
    state.packages = packageData.packages || [];
    state.history = historyData.history || [];
    if (state.priceUnlocked) {
      const priceData = await fetchJson("/api/price/list", { headers: priceHeaders() });
      state.entries = priceData.entries || [];
    }
    render();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function render() {
  renderPriceLock();
  renderPriceTable();
  renderImportHistory();
  renderCatalog();
  refs.packageJsonInput.value = JSON.stringify(state.packages, null, 2);
}

function renderPriceTable() {
  if (!state.priceUnlocked) {
    refs.priceTable.innerHTML = "";
    return;
  }
  const priceByProduct = new Map(state.entries.map((entry) => [entry.productId, entry]));
  const rows = state.catalog.slice(0, 180).map((product) => {
    const entry = priceByProduct.get(product.id);
    return `
      <div class="settings-row price-row" data-product="${escapeAttribute(product.id)}">
        <div>
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.category || "")}</span>
        </div>
        <input data-field="standard" type="number" min="0" step="1" value="${escapeAttribute(entry?.price?.standard ?? "")}" aria-label="标准价" />
        <input data-field="annual" type="number" min="0" step="1" value="${escapeAttribute(entry?.price?.annual ?? "")}" aria-label="年框价" />
        <span title="${escapeAttribute(formatProviderPrices(entry?.providerPrices))}">${escapeHtml(formatProviderPrices(entry?.providerPrices))}</span>
        <span>${escapeHtml(entry?.updatedAt || "-")}</span>
        <button class="ghost-action" data-save-price="${escapeAttribute(product.id)}" type="button">保存</button>
      </div>
    `;
  });

  refs.priceTable.innerHTML = `
    <div class="settings-row settings-row-head price-row">
      <span>设备</span>
      <span>标准价</span>
      <span>年框价</span>
      <span>各家年框价</span>
      <span>更新时间</span>
      <span></span>
    </div>
    ${rows.join("")}
  `;

  refs.priceTable.querySelectorAll("button[data-save-price]").forEach((button) => {
    button.addEventListener("click", () => saveSinglePrice(button.dataset.savePrice));
  });
}

async function saveSinglePrice(productId) {
  if (!ensurePriceUnlocked()) return;
  const row = refs.priceTable.querySelector(`[data-product="${cssEscape(productId)}"]`);
  const standard = Number(row.querySelector('[data-field="standard"]').value || 0);
  const annual = Number(row.querySelector('[data-field="annual"]').value || standard);
  try {
    const data = await fetchJson("/api/price/update", {
      method: "POST",
      headers: priceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        entry: {
          productId,
          price: { standard, annual },
        },
      }),
    });
    state.entries = data.entries || [];
    renderPriceTable();
    setStatus("价格已保存。", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function importPastedPrices() {
  if (!ensurePriceUnlocked()) return;
  const text = refs.pricePasteInput.value.trim();
  if (!text) {
    setStatus("请先粘贴价格文本。", "error");
    return;
  }
  try {
    const data = await fetchJson("/api/price/import", {
      method: "POST",
      headers: priceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text, pricePassword: state.pricePassword }),
    });
    state.entries = data.entries || [];
    renderPriceTable();
    setStatus(`已导入 ${data.matched?.length || 0} 个价格，未匹配 ${data.unmatched?.length || 0} 个。`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function importPriceFile(event) {
  if (!ensurePriceUnlocked()) {
    event.target.value = "";
    return;
  }
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const response = await fetch(apiUrl("/api/price/import"), {
      method: "POST",
      headers: priceHeaders({ "X-File-Name": encodeURIComponent(file.name) }),
      body: file,
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    const data = await response.json();
    state.entries = data.entries || [];
    renderPriceTable();
    setStatus(`价格表已导入 ${data.matched?.length || 0} 个价格。`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    event.target.value = "";
  }
}

async function unlockPrices() {
  const password = refs.pricePasswordInput.value.trim();
  if (!password) {
    setStatus("请输入价格密码。", "error");
    return;
  }
  state.pricePassword = password;
  state.priceUnlocked = true;
  sessionStorage.setItem("quotePriceUnlocked", "1");
  sessionStorage.setItem("quotePricePassword", password);
  try {
    const priceData = await fetchJson("/api/price/list", { headers: priceHeaders() });
    state.entries = priceData.entries || [];
    renderPriceLock();
    renderPriceTable();
    setStatus("价格功能已解锁。", "success");
  } catch (error) {
    state.priceUnlocked = false;
    state.pricePassword = "";
    sessionStorage.removeItem("quotePriceUnlocked");
    sessionStorage.removeItem("quotePricePassword");
    setStatus(error.message, "error");
  }
}

function restorePriceUnlock() {
  const password = sessionStorage.getItem("quotePricePassword") || "";
  state.pricePassword = password;
  state.priceUnlocked = sessionStorage.getItem("quotePriceUnlocked") === "1" && Boolean(password);
  refs.pricePasswordInput.value = password;
}

function renderPriceLock() {
  refs.priceLockPanel.classList.toggle("is-unlocked", state.priceUnlocked);
  refs.priceTools.classList.toggle("is-locked", !state.priceUnlocked);
  refs.priceFileInput.disabled = !state.priceUnlocked;
  refs.pricePasteInput.disabled = !state.priceUnlocked;
  refs.pricePasteBtn.disabled = !state.priceUnlocked;
}

function ensurePriceUnlocked() {
  if (state.priceUnlocked) return true;
  setStatus("请先输入价格密码解锁价格功能。", "error");
  refs.pricePasswordInput.focus();
  return false;
}

function priceHeaders(headers = {}) {
  return {
    ...headers,
    "X-Price-Password": state.pricePassword,
  };
}

async function importQuoteFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const response = await fetch(apiUrl("/api/import-quote"), {
      method: "POST",
      headers: { "X-File-Name": encodeURIComponent(file.name) },
      body: file,
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    const data = await response.json();
    state.history = [
      {
        importedAt: data.project?.importedAt || "",
        sourceFileName: data.project?.sourceFileName || file.name,
        matchedRate: data.matchedRate || 0,
        lineCount: data.lines?.length || 0,
        unmatchedCount: data.unmatched?.length || 0,
      },
      ...state.history,
    ];
    renderImportHistory();
    setStatus(`报价单已导入 ${data.lines?.length || 0} 行，匹配率 ${Math.round((data.matchedRate || 0) * 100)}%。`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    event.target.value = "";
  }
}

function renderImportHistory() {
  const totalLines = state.history.reduce((sum, item) => sum + Number(item.lineCount || 0), 0);
  const avgRate = state.history.length
    ? state.history.reduce((sum, item) => sum + Number(item.matchedRate || 0), 0) / state.history.length
    : 0;
  refs.importSummary.innerHTML = `
    <div><strong>${state.history.length}</strong><span>导入记录</span></div>
    <div><strong>${totalLines}</strong><span>报价行</span></div>
    <div><strong>${Math.round(avgRate * 100)}%</strong><span>平均匹配率</span></div>
  `;

  refs.importHistory.innerHTML = `
    <div class="settings-row settings-row-head import-row">
      <span>文件</span>
      <span>导入时间</span>
      <span>行数</span>
      <span>匹配率</span>
      <span>未匹配</span>
    </div>
    ${state.history
      .map(
        (item) => `
          <div class="settings-row import-row">
            <strong>${escapeHtml(item.sourceFileName || "-")}</strong>
            <span>${escapeHtml(item.importedAt || "-")}</span>
            <span>${Number(item.lineCount || 0)}</span>
            <span>${Math.round(Number(item.matchedRate || 0) * 100)}%</span>
            <span>${Number(item.unmatchedCount || 0)}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderCatalog() {
  const query = normalizeText(state.catalogSearch);
  const visible = state.catalog
    .filter((product) => {
      if (!query) return true;
      return normalizeText(`${product.name} ${product.category} ${product.provider}`).includes(query);
    })
    .slice(0, 160);

  refs.catalogTable.innerHTML = `
    <div class="settings-row settings-row-head catalog-row">
      <span>名称</span>
      <span>分类</span>
      <span>类型</span>
      <span>年框</span>
      <span>来源</span>
    </div>
    ${visible
      .map(
        (product) => `
          <div class="settings-row catalog-row">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.category || "")}</span>
            <span>${escapeHtml(product.type || "")}</span>
            <span>${product.isAnnualFrame ? "是" : "否"}</span>
            <span>${escapeHtml(product.source || "Excel")}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

async function savePackages() {
  let packages;
  try {
    packages = JSON.parse(refs.packageJsonInput.value || "[]");
  } catch {
    setStatus("套餐 JSON 格式不正确。", "error");
    return;
  }

  try {
    const data = await fetchJson("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packages }),
    });
    state.packages = data.packages || [];
    refs.packageJsonInput.value = JSON.stringify(state.packages, null, 2);
    setStatus("套餐已保存。", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function fetchJson(path, options) {
  const response = await fetch(apiUrl(path), options);
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "接口请求失败");
  return data;
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.error || "请求失败";
  }
  return (await response.text()) || "请求失败";
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("quoteSettingsTheme", nextTheme);
}

function applySavedTheme() {
  const saved = localStorage.getItem("quoteSettingsTheme");
  if (saved) document.documentElement.dataset.theme = saved;
}

function apiUrl(path) {
  const base = window.__QUOTE_API_BASE__ || "";
  return `${base}${path}`;
}

function setStatus(message, tone = "") {
  refs.settingsStatus.textContent = message;
  refs.settingsStatus.className = `status ${tone}`.trim();
}

function formatProviderPrices(providerPrices) {
  const items = Array.isArray(providerPrices) ? providerPrices : [];
  if (!items.length) return "-";
  return items
    .map((item) => `${item.provider}:${item.annual ?? item.standard ?? "-"}`)
    .join(" / ");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replaceAll('"', '\\"');
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
