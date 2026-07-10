const $ = (id) => document.getElementById(id);

const QUICK_STORAGE_KEY = "familyBudget.homeV2.quickCategories";
const USER_STORAGE_KEY = "budgetTrackerUser";
const MONTH_STORAGE_KEY = "budgetTrackerMonth";
const LAST_CATEGORY_KEY = "budgetTrackerLastCategory";
const MAX_QUICK_CATEGORIES = 8;

let appData = null;
let activeUser = localStorage.getItem(USER_STORAGE_KEY) || window.FB_CONFIG.DEFAULT_USER || "";
let activeMonth = localStorage.getItem(MONTH_STORAGE_KEY) || "";
let selectedCategory = localStorage.getItem(LAST_CATEGORY_KEY) || "";
let quickCategoryNames = [];
let messageTimer = null;

function money(value){
  const n = Number(value) || 0;
  return "€" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function api(params){
  return new Promise((resolve, reject) => {
    const callback = "fbv2_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const url = new URL(window.FB_CONFIG.API_URL);

    Object.entries(params).forEach(([key, value]) => {
      if(value !== undefined && value !== null && value !== ""){
        url.searchParams.set(key, value);
      }
    });
    url.searchParams.set("callback", callback);

    const script = document.createElement("script");
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("API timeout"));
    }, 15000);

    function cleanup(){
      clearTimeout(timer);
      script.remove();
      delete window[callback];
    }

    window[callback] = (data) => {
      cleanup();
      if(!data || data.success === false){
        reject(new Error(data?.error || "API error"));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("API request failed"));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function normalizeName(value){
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function displayName(name){
  const original = String(name || "").trim();
  const normalized = normalizeName(original);

  if(normalized === "SM" || normalized.includes("SUPER MARKET")) return "SM";
  if(normalized.includes("DELIVERY")) return "Delivery";
  if(normalized.includes("WORK") && normalized.includes("ΧΡΗΣΤ")) return "Work Χ";
  if(normalized.includes("WORK") && normalized.includes("ΓΙΑΝΝ")) return "Work Γ";
  if(normalized.includes("WORK")) return "Work";
  if(normalized.includes("ΡΟΥΧ")) return "Ρούχα";
  if(normalized.includes("HAIR") || normalized.includes("NAIL")) return "Hair";
  if(normalized.includes("CAR")) return "Car";
  if(normalized.includes("COSMOTE")) return "Cosmote";
  if(normalized.includes("VODAFONE")) return "Vodafone";
  if(normalized.includes("ADOBE")) return "Adobe";

  return original.length > 10 ? original.slice(0, 9) + "…" : original;
}

function categoryIcon(name){
  const normalized = normalizeName(name);

  if(normalized === "SM" || normalized.includes("SUPER MARKET")) return "🛒";
  if(normalized.includes("DELIVERY")) return "🍔";
  if(normalized.includes("WORK")) return "💼";
  if(normalized.includes("ΡΟΥΧ") || normalized.includes("CLOTH")) return "👕";
  if(normalized.includes("CAR") || normalized.includes("ΒΕΝΖ")) return "🚗";
  if(normalized.includes("HAIR") || normalized.includes("NAIL")) return "💅";
  if(normalized.includes("COSMOTE") || normalized.includes("VODAFONE")) return "📱";
  if(normalized.includes("ADOBE")) return "🎨";
  if(normalized.includes("ΔΕΗ") || normalized.includes("ELECTRIC")) return "💡";
  if(normalized.includes("ΕΥΔΑΠ") || normalized.includes("WATER")) return "💧";

  return "🧾";
}

function escapeHtml(value){
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRealCategoryNames(data){
  return (Array.isArray(data?.categories) ? data.categories : [])
    .map(item => String(item?.category || "").trim())
    .filter(Boolean);
}

function getDefaultQuickCategories(categoryNames){
  const preferred = [
    "SM",
    "DELIVERY",
    "WORK ΧΡΗΣΤΟΣ",
    "WORK ΓΙΑΝΝΑ",
    "ΡΟΥΧΑ"
  ];

  const byNormalized = new Map(
    categoryNames.map(name => [normalizeName(name), name])
  );

  const result = [];

  preferred.forEach(name => {
    const actual = byNormalized.get(normalizeName(name));
    if(actual && !result.includes(actual)) result.push(actual);
  });

  categoryNames.forEach(name => {
    if(result.length < MAX_QUICK_CATEGORIES && !result.includes(name)){
      result.push(name);
    }
  });

  return result.slice(0, MAX_QUICK_CATEGORIES);
}

function loadQuickCategoryNames(categoryNames){
  try{
    const saved = JSON.parse(localStorage.getItem(QUICK_STORAGE_KEY) || "[]");
    if(!Array.isArray(saved)) return getDefaultQuickCategories(categoryNames);

    const byNormalized = new Map(
      categoryNames.map(name => [normalizeName(name), name])
    );

    const valid = saved
      .map(name => byNormalized.get(normalizeName(name)))
      .filter(Boolean);

    if(valid.length) return [...new Set(valid)].slice(0, MAX_QUICK_CATEGORIES);
  }catch(error){
    console.warn("Could not read Quick Categories settings.", error);
  }

  return getDefaultQuickCategories(categoryNames);
}

function saveQuickCategoryNames(){
  localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(quickCategoryNames));
}

function parseAmount(value){
  const raw = String(value || "").trim().replace(/\s/g, "");
  if(!raw) return 0;

  let normalized = raw;

  if(raw.includes(",") && raw.includes(".")){
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");

    if(lastComma > lastDot){
      normalized = raw.replace(/\./g, "").replace(",", ".");
    }else{
      normalized = raw.replace(/,/g, "");
    }
  }else if(raw.includes(",")){
    normalized = raw.replace(",", ".");
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function sanitizeAmountInput(value){
  let clean = String(value || "").replace(/[^0-9.,]/g, "");

  const separators = [...clean].filter(char => char === "." || char === ",");
  if(separators.length > 1){
    const firstIndex = clean.search(/[.,]/);
    const before = clean.slice(0, firstIndex + 1);
    const after = clean.slice(firstIndex + 1).replace(/[.,]/g, "");
    clean = before + after;
  }

  return clean;
}

function formatAmount(value){
  return new Intl.NumberFormat("el-GR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function showMessage(text, type="success", duration=2200){
  const el = $("homeMessage");
  clearTimeout(messageTimer);
  el.textContent = text;
  el.className = "home-message " + type;
  messageTimer = setTimeout(() => el.classList.add("hidden"), duration);
}

function renderSummary(data){
  const dashboard = data.dashboard || {};
  const income = Number(dashboard.totalIncome) || 0;
  const expenses = Number(dashboard.totalSpent) || 0;
  const available = Number(dashboard.remainingAfterSpent) || 0;

  const expensesPct = income > 0
    ? Math.min(Math.round((expenses / income) * 100), 999)
    : 0;

  const availablePct = income > 0
    ? Math.max(Math.round((available / income) * 100), 0)
    : 0;

  $("incomeValue").textContent = money(income);
  $("expensesValue").textContent = money(expenses);
  $("availableValue").textContent = money(available);
  $("expensesMeta").textContent = expensesPct + "% of income";
  $("availableMeta").textContent = availablePct + "% remaining";
  $("monthPill").textContent = activeMonth || data.selectedMonth || data.latestMonth || "Month";
}

function renderMonths(){
  const menu = $("monthMenuV2");
  menu.innerHTML = "";

  const months = Array.isArray(appData?.availableMonths) ? appData.availableMonths : [];

  months.forEach(month => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = month;
    button.className = month === activeMonth ? "active" : "";

    button.addEventListener("click", async () => {
      menu.classList.add("hidden");
      if(month === activeMonth) return;

      activeMonth = month;
      localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);
      await loadData();
    });

    menu.appendChild(button);
  });
}

function renderUsers(){
  const pill = $("userPillV2");
  const menu = $("userMenuV2");
  const users = Array.isArray(appData?.users) ? appData.users : [];

  if(!activeUser && users.length){
    activeUser = users[0];
    localStorage.setItem(USER_STORAGE_KEY, activeUser);
  }

  pill.textContent = activeUser || "User";
  menu.innerHTML = "";

  users.forEach(user => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = user;
    button.className = user === activeUser ? "active" : "";

    button.addEventListener("click", async () => {
      menu.classList.add("hidden");
      if(user === activeUser) return;

      activeUser = user;
      localStorage.setItem(USER_STORAGE_KEY, activeUser);
      await loadData();
    });

    menu.appendChild(button);
  });
}

function getSelectedCategoryData(){
  const categories = Array.isArray(appData?.categories) ? appData.categories : [];
  return categories.find(item =>
    normalizeName(item?.category) === normalizeName(selectedCategory)
  ) || null;
}

function renderCategoryStatus(){
  const item = getSelectedCategoryData();

  if(!item){
    $("selectedCategoryNameV2").textContent = selectedCategory || "—";
    $("categoryBudgetV2").textContent = money(0);
    $("categorySpentV2").textContent = money(0);
    $("categoryBalanceV2").textContent = money(0);
    $("categoryProgressFillV2").style.width = "0%";
    $("categoryProgressFillV2").className = "category-progress-fill-v2";
    return;
  }

  const budget = Number(item.budget) || 0;
  const spent = Number(item.totalSpent) || 0;
  const balance = Number(item.balance);
  const safeBalance = Number.isFinite(balance) ? balance : budget - spent;
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  $("selectedCategoryNameV2").textContent = displayName(item.category);
  $("categoryBudgetV2").textContent = money(budget);
  $("categorySpentV2").textContent = money(spent);
  $("categoryBalanceV2").textContent = money(safeBalance);

  const fill = $("categoryProgressFillV2");
  fill.style.width = percent + "%";
  fill.className = "category-progress-fill-v2";

  if(percent >= 90){
    fill.classList.add("danger");
  }else if(percent >= 70){
    fill.classList.add("warning");
  }
}

function renderCategorySelect(){
  const select = $("categorySelectV2");
  const names = getRealCategoryNames(appData);
  select.innerHTML = "";

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  if(!names.some(name => normalizeName(name) === normalizeName(selectedCategory))){
    selectedCategory = names[0] || "";
  }

  select.value = selectedCategory;
}

function renderQuickCategories(){
  const container = $("quickCategories");
  if(!container || !appData) return;

  const availableNames = getRealCategoryNames(appData);
  const availableSet = new Set(availableNames.map(normalizeName));

  quickCategoryNames = quickCategoryNames
    .filter(name => availableSet.has(normalizeName(name)))
    .slice(0, MAX_QUICK_CATEGORIES);

  if(!quickCategoryNames.length){
    quickCategoryNames = getDefaultQuickCategories(availableNames);
    saveQuickCategoryNames();
  }

  if(!quickCategoryNames.some(name => normalizeName(name) === normalizeName(selectedCategory))){
    selectedCategory = quickCategoryNames[0] || availableNames[0] || "";
  }

  container.innerHTML = "";

  quickCategoryNames.forEach(name => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" +
      (normalizeName(name) === normalizeName(selectedCategory) ? " active" : "");

    button.innerHTML = `
      <span>${categoryIcon(name)}</span>
      <strong>${escapeHtml(displayName(name))}</strong>
    `;

    button.addEventListener("click", () => {
      selectedCategory = name;
      localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);
      renderQuickCategories();
      renderCategorySelect();
      renderCategoryStatus();
      $("amountInputV2").focus();
    });

    container.appendChild(button);
  });

  const more = document.createElement("button");
  more.type = "button";
  more.className = "chip";
  more.innerHTML = "<span>•••</span><strong>More</strong>";
  more.addEventListener("click", openSettings);
  container.appendChild(more);
}

function renderQuickCategorySettings(){
  const container = $("quickCategorySettings");
  if(!container || !appData) return;

  const categoryNames = getRealCategoryNames(appData);
  const selectedSet = new Set(quickCategoryNames.map(normalizeName));

  container.innerHTML = "";

  categoryNames.forEach(name => {
    const checked = selectedSet.has(normalizeName(name));
    const atLimit = quickCategoryNames.length >= MAX_QUICK_CATEGORIES;
    const row = document.createElement("label");
    row.className = "settings-category" + (!checked && atLimit ? " disabled" : "");

    row.innerHTML = `
      <span class="settings-icon">${categoryIcon(name)}</span>
      <span>
        <strong>${escapeHtml(displayName(name))}</strong>
        <small>${escapeHtml(name)}</small>
      </span>
      <input type="checkbox" ${checked ? "checked" : ""} ${!checked && atLimit ? "disabled" : ""}>
    `;

    const checkbox = row.querySelector("input");

    checkbox.addEventListener("change", () => {
      if(checkbox.checked){
        if(quickCategoryNames.length >= MAX_QUICK_CATEGORIES){
          checkbox.checked = false;
          return;
        }
        quickCategoryNames.push(name);
      }else{
        quickCategoryNames = quickCategoryNames.filter(
          item => normalizeName(item) !== normalizeName(name)
        );
      }

      saveQuickCategoryNames();
      renderQuickCategories();
      renderQuickCategorySettings();
    });

    container.appendChild(row);
  });
}

function updateAddState(){
  $("addExpenseBtnV2").disabled = parseAmount($("amountInputV2").value) <= 0;
}

async function submitExpense(){
  const amount = parseAmount($("amountInputV2").value);
  const category = $("categorySelectV2").value || selectedCategory;

  if(!activeUser){
    showMessage("Please choose a user.", "error");
    return;
  }

  if(!activeMonth){
    showMessage("Please choose a month.", "error");
    return;
  }

  if(!category){
    showMessage("Please choose a category.", "error");
    return;
  }

  if(amount <= 0){
    showMessage("Please enter a valid amount.", "error");
    return;
  }

  const button = $("addExpenseBtnV2");
  button.disabled = true;
  button.innerHTML = "<span>…</span>Saving";

  try{
    const result = await api({
      action: "addExpense",
      user: activeUser,
      month: activeMonth,
      category,
      amount
    });

    selectedCategory = category;
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);

    $("amountInputV2").value = "";
    showMessage("Added " + money(result.amount) + " to " + result.category, "success");

    button.innerHTML = "<span>✓</span>Added";
    await loadData();

    setTimeout(() => {
      button.innerHTML = "<span>＋</span>Add Expense";
      updateAddState();
      $("amountInputV2").focus();
    }, 700);
  }catch(error){
    button.innerHTML = "<span>＋</span>Add Expense";
    updateAddState();
    showMessage(error.message, "error", 3500);
  }
}

function openStableView(view){
  localStorage.setItem("budgetTrackerRequestedView", view);
  localStorage.setItem(USER_STORAGE_KEY, activeUser);
  localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);
  window.location.href = "../?v=phase5-1-layout";
}

function openSettings(){
  $("homeView").classList.add("hidden");
  $("settingsView").classList.remove("hidden");
  $("homeNavBtn").classList.remove("active");
  $("settingsNavBtn").classList.add("active");
  renderQuickCategorySettings();
}

function closeSettings(){
  $("settingsView").classList.add("hidden");
  $("homeView").classList.remove("hidden");
  $("settingsNavBtn").classList.remove("active");
  $("homeNavBtn").classList.add("active");
  renderQuickCategories();
}

function bindUi(){
  $("editQuickBtn").addEventListener("click", openSettings);
  $("settingsNavBtn").addEventListener("click", openSettings);
  $("homeNavBtn").addEventListener("click", closeSettings);
  $("closeSettingsBtn").addEventListener("click", closeSettings);

  $("historyNavBtn").addEventListener("click", () => openStableView("transactions"));
  $("dashboardNavBtn").addEventListener("click", () => openStableView("dashboard"));

  $("userPillV2").addEventListener("click", event => {
    event.stopPropagation();
    $("monthMenuV2").classList.add("hidden");
    $("userMenuV2").classList.toggle("hidden");
  });

  $("monthPill").addEventListener("click", event => {
    event.stopPropagation();
    $("userMenuV2").classList.add("hidden");
    $("monthMenuV2").classList.toggle("hidden");
  });

  document.addEventListener("click", event => {
    if(!event.target.closest(".month-picker-v2")){
      $("monthMenuV2").classList.add("hidden");
    }

    if(!event.target.closest(".user-picker-v2")){
      $("userMenuV2").classList.add("hidden");
    }
  });

  $("categorySelectV2").addEventListener("change", event => {
    selectedCategory = event.target.value;
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);
    renderQuickCategories();
    renderCategoryStatus();
  });

  const amountInput = $("amountInputV2");

  amountInput.addEventListener("focus", () => amountInput.select());

  amountInput.addEventListener("input", event => {
    event.target.value = sanitizeAmountInput(event.target.value);
    updateAddState();
  });

  amountInput.addEventListener("blur", () => {
    const value = parseAmount(amountInput.value);
    if(value > 0) amountInput.value = formatAmount(value);
  });

  amountInput.addEventListener("keydown", event => {
    if(event.key === "Enter"){
      event.preventDefault();
      if(!$("addExpenseBtnV2").disabled) submitExpense();
    }
  });

  $("addExpenseBtnV2").addEventListener("click", submitExpense);
  updateAddState();
}

async function loadData(){
  appData = await api({
    action: "getAppData",
    user: activeUser || "",
    month: activeMonth || ""
  });

  activeMonth = appData.selectedMonth || activeMonth || appData.latestMonth || "";
  localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);

  const categoryNames = getRealCategoryNames(appData);

  if(!quickCategoryNames.length){
    quickCategoryNames = loadQuickCategoryNames(categoryNames);
  }

  renderSummary(appData);
  renderMonths();
  renderUsers();
  renderCategorySelect();
  renderQuickCategories();
  renderCategoryStatus();
  renderQuickCategorySettings();
}

async function load(){
  try{
    $("monthPill").textContent = "Loading...";
    bindUi();
    await loadData();
  }catch(error){
    $("monthPill").textContent = "Error";
    showMessage(error.message, "error", 0);
    console.error(error);
  }
}

load();
