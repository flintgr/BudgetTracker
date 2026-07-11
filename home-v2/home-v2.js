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


function moneyWhole(value){
  const n = Number(value) || 0;
  return "€" + Math.round(n).toLocaleString("en-US", {
    maximumFractionDigits: 0
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


function normalizeMonthKeyV2(value){
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const yearMatch = raw.match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : "";

  const monthMap = [
    { key:"JAN", aliases:["JAN","JANUARY","ΙΑΝ","ΙΑΝΟΥΑΡΙΟΣ","ΙΑΝΟΥΑΡΙΟΥ"] },
    { key:"FEB", aliases:["FEB","FEBRUARY","ΦΕΒ","ΦΕΒΡΟΥΑΡΙΟΣ","ΦΕΒΡΟΥΑΡΙΟΥ"] },
    { key:"MAR", aliases:["MAR","MARCH","ΜΑΡ","ΜΑΡΤΙΟΣ","ΜΑΡΤΙΟΥ"] },
    { key:"APR", aliases:["APR","APRIL","ΑΠΡ","ΑΠΡΙΛΙΟΣ","ΑΠΡΙΛΙΟΥ"] },
    { key:"MAY", aliases:["MAY","ΜΑΙ","ΜΑΙΟΣ","ΜΑΙΟΥ"] },
    { key:"JUN", aliases:["JUN","JUNE","ΙΟΥΝ","ΙΟΥΝΙΟΣ","ΙΟΥΝΙΟΥ"] },
    { key:"JUL", aliases:["JUL","JULY","ΙΟΥΛ","ΙΟΥΛΙΟΣ","ΙΟΥΛΙΟΥ"] },
    { key:"AUG", aliases:["AUG","AUGUST","ΑΥΓ","ΑΥΓΟΥΣΤΟΣ","ΑΥΓΟΥΣΤΟΥ"] },
    { key:"SEP", aliases:["SEP","SEPT","SEPTEMBER","ΣΕΠ","ΣΕΠΤΕΜΒΡΙΟΣ","ΣΕΠΤΕΜΒΡΙΟΥ"] },
    { key:"OCT", aliases:["OCT","OCTOBER","ΟΚΤ","ΟΚΤΩΒΡΙΟΣ","ΟΚΤΩΒΡΙΟΥ"] },
    { key:"NOV", aliases:["NOV","NOVEMBER","ΝΟΕ","ΝΟΕΜΒΡΙΟΣ","ΝΟΕΜΒΡΙΟΥ"] },
    { key:"DEC", aliases:["DEC","DECEMBER","ΔΕΚ","ΔΕΚΕΜΒΡΙΟΣ","ΔΕΚΕΜΒΡΙΟΥ"] }
  ];

  let month = "";

  for(const entry of monthMap){
    if(entry.aliases.some(alias => raw.includes(alias))){
      month = entry.key;
      break;
    }
  }

  return year && month ? year + " " + month : raw;
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

function iconSvgV2(type){
  const shapes = {
    cart: '<path d="M4 5h2l1.6 8.2A2 2 0 0 0 9.6 15h7.8a2 2 0 0 0 1.9-1.4L21 8H8l-.5-3H4Z"/><circle cx="10" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/>',
    delivery: '<path d="M5 10a7 7 0 0 1 14 0H5Z"/><path d="M4 13h16l-1.2 6H5.2L4 13Z"/>',
    work: '<rect x="3" y="7" width="18" height="13" rx="2"/><rect x="8" y="3" width="8" height="5" rx="2"/><rect x="10" y="11" width="4" height="3" rx="1"/>',
    shirt: '<path d="m8 4 4 2 4-2 5 4-4 3v9H7v-9L3 8l5-4Z"/>',
    car: '<path d="m5 10 2-5h10l2 5h1a2 2 0 0 1 2 2v5H2v-5a2 2 0 0 1 2-2h1Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    beauty: '<rect x="8" y="7" width="8" height="14" rx="2"/><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="10" y="1" width="4" height="3" rx="1"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18.5" r="1"/>',
    art: '<path d="M12 3a9 9 0 1 0 0 18h2a3 3 0 0 0 0-6h-1.5a2.5 2.5 0 0 1 0-5H15a5 5 0 0 0-3-7Z"/><circle cx="7.5" cy="10" r="1.2"/><circle cx="9" cy="6.5" r="1.2"/><circle cx="14" cy="6.5" r="1.2"/>',
    light: '<path d="M12 2a7 7 0 0 0-4.2 12.6c1 .8 1.4 1.6 1.4 2.9h5.6c0-1.3.4-2.1 1.4-2.9A7 7 0 0 0 12 2Z"/><rect x="9" y="18" width="6" height="2" rx="1"/><rect x="10" y="21" width="4" height="1.5" rx=".75"/>',
    water: '<path d="M12 2s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12Z"/>',
    home: '<path d="m2 11 10-9 10 9-2 2-2-1.8V21H6v-9.8L4 13l-2-2Z"/><rect x="10" y="14" width="4" height="7"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><rect x="2" y="7" width="20" height="5" rx="2"/><rect x="10" y="7" width="4" height="14"/><path d="M12 7C8 7 6 5.5 6 3.8 6 2.8 6.8 2 7.8 2 10 2 12 7 12 7Z"/><path d="M12 7c4 0 6-1.5 6-3.2 0-1-.8-1.8-1.8-1.8C14 2 12 7 12 7Z"/>',
    school: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 12v5c4 3 8 3 12 0v-5l-6 3-6-3Z"/><rect x="20" y="9" width="2" height="8" rx="1"/>',
    insurance: '<path d="M12 2 3 6v6c0 5.5 3.8 9 9 10 5.2-1 9-4.5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6-2-1-3 4-1-1-2 1Z" fill="#fff"/>',
    document: '<path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v5h5" fill="#fff" opacity=".35"/><rect x="9" y="11" width="6" height="2" rx="1" fill="#fff"/><rect x="9" y="15" width="6" height="2" rx="1" fill="#fff"/>'
  };

  return '<svg class="cf-icon-v2 flat" viewBox="0 0 24 24" aria-hidden="true">' +
    (shapes[type] || shapes.document) +
    '</svg>';
}

function categoryIcon(name){
  const normalized = normalizeName(name);

  if(normalized === "SM" || normalized.includes("SUPER MARKET")) return iconSvgV2("cart");
  if(normalized.includes("DELIVERY")) return iconSvgV2("delivery");
  if(normalized.includes("WORK")) return iconSvgV2("work");
  if(normalized.includes("ΡΟΥΧ") || normalized.includes("CLOTH")) return iconSvgV2("shirt");
  if(normalized.includes("CAR") || normalized.includes("ΒΕΝΖ")) return iconSvgV2("car");
  if(normalized.includes("HAIR") || normalized.includes("NAIL")) return iconSvgV2("beauty");
  if(normalized.includes("COSMOTE") || normalized.includes("VODAFONE")) return iconSvgV2("phone");
  if(normalized.includes("ADOBE")) return iconSvgV2("art");
  if(normalized.includes("ΔΕΗ") || normalized.includes("ELECTRIC")) return iconSvgV2("light");
  if(normalized.includes("ΕΥΔΑΠ") || normalized.includes("WATER")) return iconSvgV2("water");
  if(normalized.includes("ΔΑΝΕΙΟ") || normalized.includes("RENT") || normalized.includes("HOUSE")) return iconSvgV2("home");
  if(normalized.includes("ΔΩΡ") || normalized.includes("GIFT")) return iconSvgV2("gift");
  if(normalized.includes("DELACROIX") || normalized.includes("SCHOOL") || normalized.includes("ΣΧΟΛ")) return iconSvgV2("school");
  if(normalized.includes("ALLIANZ") || normalized.includes("INS")) return iconSvgV2("insurance");

  return iconSvgV2("document");
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

  $("incomeValue").textContent = moneyWhole(income);
  $("expensesValue").textContent = moneyWhole(expenses);
  $("availableValue").textContent = moneyWhole(available);
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

  const matched = names.find(name =>
    normalizeName(name) === normalizeName(selectedCategory)
  );

  selectedCategory = matched || names[0] || "";
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

  const selectedExistsInAllCategories = availableNames.some(name =>
    normalizeName(name) === normalizeName(selectedCategory)
  );

  if(!selectedExistsInAllCategories){
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



function renderEditBudgetV2(){
  const container = $("editBudgetListV2");
  if(!container || !appData) return;

  const categories = Array.isArray(appData.categories) ? appData.categories : [];
  container.innerHTML = "";

  categories.forEach(item => {
    const row = document.createElement("label");
    row.className = "edit-budget-row-v2";

    row.innerHTML = `
      <span class="edit-budget-icon-v2">${categoryIcon(item.category)}</span>
      <span class="edit-budget-main-v2">
        <strong>${escapeHtml(displayName(item.category))}</strong>
        <small>${escapeHtml(item.category)}</small>
      </span>
      <input
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        value="${Number(item.budget) || 0}"
        data-category="${escapeHtml(item.category)}"
        aria-label="Budget for ${escapeHtml(item.category)}"
      >
    `;

    container.appendChild(row);
  });
}

function readBudgetItemsV2(){
  return [...document.querySelectorAll("#editBudgetListV2 input[data-category]")].map(input => ({
    category: input.dataset.category,
    budget: Math.max(Number(input.value) || 0, 0)
  }));
}

async function saveBudgetsV2(){
  const button = $("saveBudgetsBtnV2");
  const items = readBudgetItemsV2();

  if(!items.length) return;

  button.disabled = true;
  button.textContent = "Saving...";

  try{
    const result = await api({
      action:"saveBudgets",
      month:activeMonth,
      items:JSON.stringify(items)
    });

    if(Array.isArray(result.categories)){
      appData.categories = result.categories;
    }

    if(result.dashboard){
      appData.dashboard = result.dashboard;
    }

    renderCategorySelect();
    renderQuickCategories();
    renderCategoryStatus();
    renderDashboardV2();
    renderEditBudgetV2();

    showMessage("Budgets updated.", "success", 1800);
  }catch(error){
    showMessage(error.message, "error", 3500);
  }finally{
    button.disabled = false;
    button.textContent = "Save Budgets";
  }
}

function renderMonthManagementV2(){
  const select = $("monthManagementSelectV2");
  if(!select || !appData) return;

  const previous = select.value || activeMonth;
  const months = Array.isArray(appData.availableMonths) ? appData.availableMonths : [];

  select.innerHTML = "";

  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    select.appendChild(option);
  });

  select.value = months.includes(previous) ? previous : (activeMonth || months[0] || "");
}


async function createNextMonthV2(){
  const months = Array.isArray(appData?.availableMonths) ? appData.availableMonths : [];
  const fromMonth = months.length ? months[months.length - 1] : activeMonth;

  if(!fromMonth) return;

  const approved = window.confirm(
    "Create the next month after " + fromMonth + "?\n\nBudgets and Income Sources will be copied. Spent will start at 0."
  );

  if(!approved) return;

  const button = $("createNextMonthBtnV2");
  button.disabled = true;
  button.textContent = "Creating...";

  try{
    const result = await api({
      action:"createNextMonth",
      fromMonth
    });

    const createdMonth =
      result.createdMonth ||
      result.month ||
      result.newMonth ||
      "";

    if(createdMonth){
      activeMonth = createdMonth;
      localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);
    }

    await loadData();

    if(!createdMonth){
      const refreshedMonths = Array.isArray(appData?.availableMonths)
        ? appData.availableMonths
        : [];
      activeMonth = refreshedMonths[refreshedMonths.length - 1] || activeMonth;
      localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);
      await loadData();
    }

    renderMonthManagementV2();
    showMessage(activeMonth + " was created.", "success", 2200);
    setActiveMainViewV2("home");
  }catch(error){
    showMessage(error.message, "error", 3500);
  }finally{
    button.disabled = false;
    button.textContent = "Create Next Month";
  }
}

async function clearMonthDataV2(){
  const month = $("monthManagementSelectV2").value;
  if(!month) return;

  const approved = window.confirm(
    "Clear all expenses and history for " + month + "?\\n\\nBudgets and income sources will stay unchanged."
  );

  if(!approved) return;

  const button = $("clearMonthBtnV2");
  button.disabled = true;
  button.textContent = "Clearing...";

  try{
    await api({
      action:"clearMonthData",
      month
    });

    activeMonth = month;
    localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);

    await loadData();
    await loadUserSpendingV2();

    showMessage(month + " was cleared.", "success", 2200);
  }catch(error){
    showMessage(error.message, "error", 3500);
  }finally{
    button.disabled = false;
    button.textContent = "Clear Month Data";
  }
}

async function deleteMonthV2(){
  const month = $("monthManagementSelectV2").value;
  if(!month) return;

  const typed = window.prompt(
    "Type DELETE to permanently delete " + month + " and all its history."
  );

  if(typed !== "DELETE") return;

  const button = $("deleteMonthBtnV2");
  button.disabled = true;
  button.textContent = "Deleting...";

  try{
    const result = await api({
      action:"deleteMonth",
      month
    });

    activeMonth = result.selectedMonth || "";
    localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);

    await loadData();
    await loadUserSpendingV2();

    showMessage(month + " was deleted.", "success", 2200);
    setActiveMainViewV2("home");
  }catch(error){
    showMessage(error.message, "error", 3500);
  }finally{
    button.disabled = false;
    button.textContent = "Delete Month";
  }
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





let userSpendingV2 = {
  users: [],
  total: 0
};

function userSpendingAmountV2(names){
  const wanted = (Array.isArray(names) ? names : [names]).map(normalizeName);

  const item = (userSpendingV2.users || []).find(entry =>
    wanted.includes(normalizeName(entry.user))
  );

  return item ? Number(item.amount) || 0 : 0;
}

function renderUserSpendingDonutV2(){
  const christos = userSpendingAmountV2(["Χρήστος","Chris","Christos"]);
  const gianna = userSpendingAmountV2(["Γιάννα","Gianna"]);
  const total = christos + gianna;

  const christosPercent = total > 0 ? christos / total : 0;
  const giannaPercent = total > 0 ? gianna / total : 0;
  const circumference = 2 * Math.PI * 76;

  const christosLength = circumference * christosPercent;
  const giannaLength = circumference * giannaPercent;

  const christosCircle = $("donutChristosV2");
  const giannaCircle = $("donutGiannaV2");

  christosCircle.style.strokeDasharray =
    christosLength + " " + Math.max(circumference - christosLength, 0);
  christosCircle.style.strokeDashoffset = "0";

  giannaCircle.style.strokeDasharray =
    giannaLength + " " + Math.max(circumference - giannaLength, 0);
  giannaCircle.style.strokeDashoffset = String(-christosLength);

  $("donutChristosPercentV2").textContent = Math.round(christosPercent * 100) + "%";
  $("donutGiannaPercentV2").textContent = Math.round(giannaPercent * 100) + "%";
  $("donutChristosAmountV2").textContent = moneyWhole(christos);
  $("donutGiannaAmountV2").textContent = moneyWhole(gianna);
}

async function loadUserSpendingV2(){
  try{
    const response = await api({
      action:"getUserSpending",
      month:activeMonth
    });

    userSpendingV2 = {
      users:Array.isArray(response.users) ? response.users : [],
      total:Number(response.total) || 0
    };

    renderUserSpendingDonutV2();
  }catch(error){
    userSpendingV2 = { users:[], total:0 };
    renderUserSpendingDonutV2();
    console.error("User spending chart:", error);
  }
}

function getIncomeSourcesMapV2(){
  const sources = Array.isArray(appData?.dashboard?.incomeSources)
    ? appData.dashboard.incomeSources
    : [];

  const map = {};
  sources.forEach(item => {
    map[normalizeName(item.name)] = Number(item.amount) || 0;
  });

  return map;
}

function readIncomeInputsV2(){
  return {
    emsa: Math.max(Number($("incomeEmsaV2").value) || 0, 0),
    thema: Math.max(Number($("incomeThemaV2").value) || 0, 0),
    giochi: Math.max(Number($("incomeGiochiV2").value) || 0, 0),
    other: Math.max(Number($("incomeOtherV2").value) || 0, 0)
  };
}

function updateIncomeEditorTotalV2(){
  const values = readIncomeInputsV2();
  const total = values.emsa + values.thema + values.giochi + values.other;
  $("incomeEditorTotalV2").textContent = moneyWhole(total);
}

function renderIncomeEditorV2(){
  const map = getIncomeSourcesMapV2();

  $("incomeEmsaV2").value = map["EMSA"] || 0;
  $("incomeThemaV2").value = map[normalizeName("ΘΕΜΑ")] || 0;
  $("incomeGiochiV2").value = map["GIOCHI"] || 0;
  $("incomeOtherV2").value = map["OTHER"] || 0;

  updateIncomeEditorTotalV2();
}

async function saveIncomeSourcesV2(){
  const button = $("saveIncomeSourcesBtnV2");
  const values = readIncomeInputsV2();

  button.disabled = true;
  button.textContent = "Saving...";

  try{
    await api({
      action:"saveIncomeSources",
      month:activeMonth,
      emsa:values.emsa,
      thema:values.thema,
      giochi:values.giochi,
      other:values.other
    });

    await loadData();
    renderDashboardV2();
    showMessage("Income updated.", "success");
  }catch(error){
    showMessage(error.message, "error", 3500);
  }finally{
    button.disabled = false;
    button.textContent = "Save Income";
  }
}

function renderDashboardV2(){
  renderIncomeEditorV2();
  const d = appData?.dashboard || {};
  const income = Number(d.totalIncome)||0, expenses = Number(d.totalSpent)||0, available = Number(d.remainingAfterSpent)||0;
  const percent = income>0 ? Math.min((expenses/income)*100,100) : 0;
  $("dashboardIncomeV2").textContent = moneyWhole(income);
  $("dashboardExpensesV2").textContent = moneyWhole(expenses);
  $("dashboardAvailableV2").textContent = moneyWhole(available);
  $("dashboardSpentPercentV2").textContent = Math.round(percent)+"%";
  const fill = $("dashboardProgressFillV2");
  fill.style.width = percent+"%";
  fill.className = "dashboard-progress-fill-v2" + (percent>=90?" danger":percent>=70?" warning":"");

  const categories = Array.isArray(appData?.categories) ? appData.categories : [];
  $("dashboardCategoryCountV2").textContent = String(categories.length);
  const list = $("dashboardCategoryListV2");
  list.innerHTML = "";
  if(!categories.length){
    list.innerHTML = '<div class="dashboard-empty-v2">No category data for this month.</div>';
    return;
  }

  categories.slice().sort((a,b)=>(Number(b.totalSpent)||0)-(Number(a.totalSpent)||0)).forEach(item=>{
    const budget=Number(item.budget)||0, spent=Number(item.totalSpent)||0;
    const rawBalance=Number(item.balance), balance=Number.isFinite(rawBalance)?rawBalance:budget-spent;
    const p=budget>0?Math.min((spent/budget)*100,100):0;
    const row=document.createElement("article");
    row.className="dashboard-category-row-v2";
    row.innerHTML=`
      <div class="dashboard-category-head-v2">
        <div class="dashboard-category-icon-v2">${categoryIcon(item.category)}</div>
        <div class="dashboard-category-main-v2">
          <strong>${escapeHtml(displayName(item.category))}</strong>
          <span>${money(spent)} of ${money(budget)}</span>
        </div>
        <div class="dashboard-category-balance-v2">
          <strong>${money(balance)}</strong><span>Balance</span>
        </div>
      </div>
      <div class="dashboard-category-progress-v2">
        <div class="${p>=90?"danger":p>=70?"warning":""}" style="width:${p}%"></div>
      </div>`;
    list.appendChild(row);
  });
}

async function openDashboardV2(){
  setActiveMainViewV2("dashboard");
  renderDashboardV2();
  await loadUserSpendingV2();
}

function addSelectOption(select, value, label){
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function renderHistoryFiltersV2(){
  const monthSelect = $("historyMonthFilterV2");
  const userSelect = $("historyUserFilterV2");

  const previousMonth = monthSelect.value || "current";
  const previousUser = userSelect.dataset.initialized === "true"
    ? userSelect.value
    : "";

  monthSelect.innerHTML = "";
  addSelectOption(monthSelect, "current", "Current Month");
  addSelectOption(monthSelect, "", "All Months");
  (appData?.availableMonths || []).forEach(month => addSelectOption(monthSelect, month, month));

  userSelect.innerHTML = "";
  addSelectOption(userSelect, "current", "Current User");
  addSelectOption(userSelect, "", "All Users");
  (appData?.users || []).forEach(user => addSelectOption(userSelect, user, user));

  monthSelect.value = [...monthSelect.options].some(option => option.value === previousMonth)
    ? previousMonth
    : "current";

  userSelect.value = [...userSelect.options].some(option => option.value === previousUser)
    ? previousUser
    : "";

  userSelect.dataset.initialized = "true";
}

function getHistoryFiltersV2(){
  const monthValue = $("historyMonthFilterV2").value;
  const userValue = $("historyUserFilterV2").value;

  return {
    month: monthValue,
    user: userValue === "current" ? activeUser : userValue
  };
}

function formatHistoryDateV2(value){
  if(!value) return "";

  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return String(value);

  const datePart = new Intl.DateTimeFormat("el-GR", {
    timeZone:"Europe/Athens",
    day:"2-digit",
    month:"short",
    year:"numeric"
  }).format(date);

  const timePart = new Intl.DateTimeFormat("el-GR", {
    timeZone:"Europe/Athens",
    hour:"2-digit",
    minute:"2-digit",
    hour12:false
  }).format(date);

  return datePart + " · " + timePart;
}

function updateHistorySummaryV2(items){
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  $("historyCountV2").textContent = String(items.length);
  $("historyTotalV2").textContent = money(total);
}

function renderHistoryItemsV2(items){
  const list = $("historyListV2");
  list.innerHTML = "";

  if(!items.length){
    list.innerHTML = '<div class="history-empty-v2">No transactions for the selected filters.</div>';
    return;
  }

  items.forEach(transaction => {
    const action = String(transaction.action || "Added");
    const actionClass = action.toLowerCase().replace(/\s+/g, "-");

    const row = document.createElement("article");
    row.className = "history-item-v2";
    row.innerHTML = `
      <div class="history-icon-v2">${categoryIcon(transaction.category)}</div>

      <div class="history-main-v2">
        <strong>${escapeHtml(transaction.category)}</strong>
        <span class="history-meta-v2">
          ${escapeHtml(transaction.user)} · ${escapeHtml(transaction.month)}<br>
          ${escapeHtml(formatHistoryDateV2(transaction.date))}
        </span>
        <span class="history-action-v2 ${escapeHtml(actionClass)}">${escapeHtml(action)}</span>
      </div>

      <div class="history-side-v2">
        <strong>${money(transaction.amount)}</strong>
        <button class="history-delete-v2 ${transaction.canDelete ? "" : "hidden"}" type="button">Delete</button>
      </div>
    `;

    const deleteButton = row.querySelector(".history-delete-v2");
    if(deleteButton && transaction.canDelete){
      deleteButton.addEventListener("click", () => deleteHistoryTransactionV2(transaction));
    }

    list.appendChild(row);
  });
}

async function loadHistoryV2(){
  const status = $("historyStatusV2");
  const list = $("historyListV2");
  const filters = getHistoryFiltersV2();

  status.textContent = "Loading history...";
  list.innerHTML = '<div class="history-empty-v2">Loading...</div>';

  try{
    const response = await api({
      action:"getTransactions",
      month:filters.month === "current" ? "" : (filters.month || ""),
      user:filters.user || ""
    });

    let items = Array.isArray(response.transactions) ? response.transactions : [];

    if(filters.month === "current"){
      const activeMonthKey = normalizeMonthKeyV2(activeMonth);

      items = items.filter(item =>
        normalizeMonthKeyV2(item.month) === activeMonthKey
      );
    }

    updateHistorySummaryV2(items);
    renderHistoryItemsV2(items);
    status.textContent = items.length + " ledger rows";
  }catch(error){
    updateHistorySummaryV2([]);
    list.innerHTML = '<div class="history-empty-v2">History could not load.</div>';
    status.textContent = "Error: " + error.message;
  }
}

async function deleteHistoryTransactionV2(transaction){
  const approved = window.confirm(
    "Delete " + money(transaction.amount) + " from " + transaction.category + "?"
  );

  if(!approved) return;

  try{
    await api({
      action:"deleteTransaction",
      id:transaction.id
    });

    showMessage("Transaction deleted.", "success");
    await loadData();
    await loadHistoryV2();
  }catch(error){
    showMessage(error.message, "error", 3500);
  }
}

function setActiveMainViewV2(viewName){
  $("homeView").classList.toggle("hidden", viewName !== "home");
  $("historyViewV2").classList.toggle("hidden", viewName !== "history");
  $("dashboardViewV2").classList.toggle("hidden", viewName !== "dashboard");
  $("settingsView").classList.toggle("hidden", viewName !== "settings");

  $("homeNavBtn").classList.toggle("active", viewName === "home");
  $("historyNavBtn").classList.toggle("active", viewName === "history");
  $("dashboardNavBtn").classList.toggle("active", viewName === "dashboard");
  $("settingsNavBtn").classList.toggle("active", viewName === "settings");

  $("pageTitleV2").textContent =
    viewName === "history" ? "History" :
    viewName === "dashboard" ? "Dashboard" :
    viewName === "settings" ? "Settings" :
    "Home";
}

async function openHistoryV2(){
  setActiveMainViewV2("history");
  renderHistoryFiltersV2();
  await loadHistoryV2();
}

function openStableView(view){
  localStorage.setItem("budgetTrackerRequestedView", view);
  localStorage.setItem(USER_STORAGE_KEY, activeUser);
  localStorage.setItem(MONTH_STORAGE_KEY, activeMonth);
  window.location.href = "../?v=phase5-1-layout";
}

function openSettings(){
  setActiveMainViewV2("settings");
  renderQuickCategorySettings();
  renderEditBudgetV2();
  renderMonthManagementV2();
}

function closeSettings(){
  setActiveMainViewV2("home");
  renderQuickCategories();
}

function bindUi(){
  $("editQuickBtn").addEventListener("click", openSettings);
  $("settingsNavBtn").addEventListener("click", openSettings);
  $("homeNavBtn").addEventListener("click", closeSettings);

  $("historyNavBtn").addEventListener("click", openHistoryV2);
  $("dashboardNavBtn").addEventListener("click", openDashboardV2);

  $("historyMonthFilterV2").addEventListener("change", loadHistoryV2);
  $("historyUserFilterV2").addEventListener("change", loadHistoryV2);
  $("refreshHistoryBtnV2").addEventListener("click", loadHistoryV2);
  $("refreshDashboardBtnV2").addEventListener("click", async () => {
    const button = $("refreshDashboardBtnV2");
    button.disabled = true;
    button.textContent = "Refreshing...";

    try{
      await loadData();
      renderDashboardV2();
      await loadUserSpendingV2();
      showMessage("Dashboard refreshed.", "success", 1400);
    }catch(error){
      showMessage(error.message, "error", 3500);
    }finally{
      button.disabled = false;
      button.textContent = "Refresh";
    }
  });
  ["incomeEmsaV2","incomeThemaV2","incomeGiochiV2","incomeOtherV2"].forEach(id => {
    $(id).addEventListener("input", updateIncomeEditorTotalV2);
  });
  $("saveIncomeSourcesBtnV2").addEventListener("click", saveIncomeSourcesV2);
  $("saveBudgetsBtnV2").addEventListener("click", saveBudgetsV2);
  $("createNextMonthBtnV2").addEventListener("click", createNextMonthV2);
  $("clearMonthBtnV2").addEventListener("click", clearMonthDataV2);
  $("deleteMonthBtnV2").addEventListener("click", deleteMonthV2);

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
    renderCategorySelect();
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
  renderEditBudgetV2();
  renderMonthManagementV2();
  renderHistoryFiltersV2();
  renderDashboardV2();

  if(!$("dashboardViewV2").classList.contains("hidden")){
    await loadUserSpendingV2();
  }
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
