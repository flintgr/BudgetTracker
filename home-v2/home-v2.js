const $ = (id) => document.getElementById(id);

const QUICK_STORAGE_KEY = "familyBudget.homeV2.quickCategories";
const MAX_QUICK_CATEGORIES = 8;

let appData = null;
let selectedCategory = "";
let quickCategoryNames = [];

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

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set("callback", callback);

    const script = document.createElement("script");
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("API timeout"));
    }, 12000);

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
  $("monthPill").textContent = data.selectedMonth || data.latestMonth || "Month";
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
    selectedCategory = quickCategoryNames[0] || "";
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
      renderQuickCategories();
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
}

async function load(){
  try{
    $("monthPill").textContent = "Loading...";

    appData = await api({
      action: "getAppData",
      user: window.FB_CONFIG.DEFAULT_USER || ""
    });

    const categoryNames = getRealCategoryNames(appData);
    quickCategoryNames = loadQuickCategoryNames(categoryNames);

    renderSummary(appData);
    renderQuickCategories();
    bindUi();
  }catch(error){
    $("monthPill").textContent = "Error";
    console.error(error);
  }
}

load();


const amountInput=document.querySelector('.amount-field input');
const addBtn=document.querySelector('.add');

function parseAmount(v){
  return parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;
}
function formatAmount(v){
  return new Intl.NumberFormat('el-GR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
}
function updateAddState(){
  const v=parseAmount(amountInput.value);
  addBtn.disabled=v<=0;
  addBtn.style.opacity=addBtn.disabled?'0.5':'1';
}
if(amountInput){
 amountInput.setAttribute('inputmode','decimal');
 amountInput.addEventListener('focus',()=>amountInput.select());
 amountInput.addEventListener('input',e=>{
   let t=e.target.value.replace(/[^0-9.,]/g,'');
   const c=(t.match(/,/g)||[]).length;
   if(c>1){
     const i=t.indexOf(',');
     t=t.slice(0,i+1)+t.slice(i+1).replace(/,/g,'');
   }
   e.target.value=t;
   updateAddState();
 });
 amountInput.addEventListener('blur',()=>{
   const v=parseAmount(amountInput.value);
   if(v>0) amountInput.value=formatAmount(v);
 });
 addBtn.disabled=true;
 addBtn.addEventListener('click',()=>{
   amountInput.value='';
   updateAddState();
   amountInput.focus();
 });
}
