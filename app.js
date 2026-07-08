const FAVORITES = [
  { label: "🛒 SM", category: "SM" },
  { label: "🍔 DELIVERY", category: "DELIVERY" },
  { label: "💼 WORK ΓΙΑΝΝΑ", category: "WORK ΓΙΑΝΝΑ" },
  { label: "💼 WORK ΧΡΗΣΤΟΣ", category: "WORK ΧΡΗΣΤΟΣ" },
  { label: "👕 ΡΟΥΧΑ", category: "ΡΟΥΧΑ", full: true }
];

const APP_VERSION = "Sprint 1.1.2";
const App = { data:null, state:{month:"", user:"", category:"SM", view:"home"}, els:{}, toastTimer:null };

window.addEventListener("load", init);

function $(id){ return document.getElementById(id); }

function init(){
  cache();
  bind();

  if(!API_URL || API_URL.includes("PASTE_YOUR")){
    showMessage("Set API_URL in config.js first.","error", 0);
    return;
  }

  App.state.month = localStorage.getItem("budgetTrackerMonth") || "";
  App.state.user = localStorage.getItem("budgetTrackerUser") || "";
  App.state.category = localStorage.getItem("budgetTrackerLastCategory") || "SM";

  loadData(App.state.month);

  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}

function cache(){
  [
    "monthButton","monthMenu","setupCard","userSelect","continueBtn","mainApp","bottomNav",
    "miniDashboard","miniRemaining","miniDashboardFill",
    "dashboardCard","dashRemaining","dashPercent","dashProgressFill","dashIncome","dashExpenses",
    "userButtons","favoriteButtons","heroCard","previewCategory","previewBalance","previewBudget",
    "previewSpent","progressFill","categorySelect","amountInput","addBtn","message","undoCard",
    "lastExpenseText","undoBtn","budgetList","settingsMonth","settingsUser","createMonthBtn","settingsMessage"
  ].forEach(id => App.els[id] = $(id));

  App.els.views={home:$("viewHome"),budget:$("viewBudget"),dashboard:$("viewDashboard"),transactions:$("viewTransactions"),settings:$("viewSettings")};
  App.els.navButtons=[...document.querySelectorAll(".nav-btn")];
}

function bind(){
  App.els.monthButton.addEventListener("click", ()=>App.els.monthMenu.classList.toggle("hidden"));
  document.addEventListener("click", e=>{ if(!e.target.closest(".month-picker")) App.els.monthMenu.classList.add("hidden"); });

  App.els.navButtons.forEach(btn=>btn.addEventListener("click", ()=>switchView(btn.dataset.view)));

  App.els.continueBtn.addEventListener("click", ()=>{
    setUser(App.els.userSelect.value);
    showMain();
    loadData(App.state.month);
  });

  App.els.categorySelect.addEventListener("change", ()=>setCategory(App.els.categorySelect.value));
  App.els.addBtn.addEventListener("click", submitExpense);
  App.els.undoBtn.addEventListener("click", smartUndo);
  App.els.createMonthBtn.addEventListener("click", createNextMonth);
  if(App.els.refreshTransactionsBtn) App.els.refreshTransactionsBtn.addEventListener("click", loadTransactions);
  if(App.els.historyMonthFilter) App.els.historyMonthFilter.addEventListener("change", loadTransactions);
  if(App.els.historyUserFilter) App.els.historyUserFilter.addEventListener("change", loadTransactions);
  if(App.els.refreshTransactionsBtn) App.els.refreshTransactionsBtn.addEventListener("click", loadTransactions);

  document.addEventListener("keydown", e=>{
    if(e.key==="Enter" && document.activeElement===App.els.amountInput){
      e.preventDefault();
      submitExpense();
    }
  });
}

function api(params){
  return new Promise((resolve,reject)=>{
    const cb="bt_cb_"+Date.now()+"_"+Math.floor(Math.random()*100000);
    params.callback=cb;

    const script=document.createElement("script");
    script.src=API_URL+"?"+new URLSearchParams(params).toString();

    window[cb]=data=>{
      delete window[cb];
      script.remove();

      if(data && data.success===false) reject(new Error(data.error || "Unknown error"));
      else resolve(data);
    };

    script.onerror=()=>{
      delete window[cb];
      script.remove();
      reject(new Error("Network error"));
    };

    document.body.appendChild(script);
  });
}

function loadData(month){
  const params={action:"getAppData", user:App.state.user || ""};
  if(month) params.month=month;

  return api(params)
    .then(data=>{
      App.data=data;
      App.state.month=data.selectedMonth;
      localStorage.setItem("budgetTrackerMonth", App.state.month);
      if(!App.state.user && data.users.length) App.state.user = localStorage.getItem("budgetTrackerUser") || "";
      renderAll();
    })
    .catch(err=>showMessage(err.message,"error",0));
}

function renderAll(){
  renderMonths();
  renderSetupUsers();
  renderCategories();

  if(App.state.user) showMain();
  else showSetup();

  restoreCategory();
  renderMiniDashboard();
  renderDashboard();
  renderBudgetList();
  renderSettings();
  renderUsers();
  renderFavorites();
  renderPreview();
  renderSmartUndo();
  applySprintDashboardCards();
  renderHistoryFilters();
  switchView(App.state.view);
}

function renderMonths(){
  App.els.monthButton.textContent=App.state.month || "Month";
  App.els.monthMenu.innerHTML="";

  App.data.availableMonths.forEach(month=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="month-option"+(month===App.state.month?" active":"");
    b.textContent=month;
    b.addEventListener("click", ()=>{
      App.state.month=month;
      App.state.category="SM";
      clearSmartUndo();
      localStorage.setItem("budgetTrackerMonth",month);
      localStorage.setItem("budgetTrackerLastCategory","SM");
      App.els.monthMenu.classList.add("hidden");
      loadData(month);
    });
    App.els.monthMenu.appendChild(b);
  });
}

function switchView(view){
  App.state.view=view;
  if(view==="transactions") setTimeout(loadTransactions, 50);
  if(view==="transactions") setTimeout(loadTransactions, 50);
  Object.entries(App.els.views).forEach(([name,el])=>el.classList.toggle("active-view", name===view));
  App.els.navButtons.forEach(b=>b.classList.toggle("active", b.dataset.view===view));
}

function showSetup(){
  App.els.setupCard.classList.remove("hidden");
  App.els.mainApp.classList.add("hidden");
  App.els.bottomNav.classList.add("hidden");
}

function showMain(){
  App.els.setupCard.classList.add("hidden");
  App.els.mainApp.classList.remove("hidden");
  App.els.bottomNav.classList.remove("hidden");
}

function setUser(user){
  App.state.user=user;
  localStorage.setItem("budgetTrackerUser",user);
}

function setCategory(category){
  App.state.category=category;
  App.els.categorySelect.value=category;
  localStorage.setItem("budgetTrackerLastCategory",category);
  renderFavorites();
  renderPreview();
}

function renderSetupUsers(){
  App.els.userSelect.innerHTML="";
  App.data.users.forEach(u=>{
    const o=document.createElement("option");
    o.value=u; o.textContent=u;
    App.els.userSelect.appendChild(o);
  });
}

function renderUsers(){
  App.els.userButtons.innerHTML="";
  App.data.users.forEach(u=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="user-button"+(u===App.state.user?" active":"");
    b.textContent="👤 "+u;
    b.addEventListener("click", ()=>{
      setUser(u);
      clearSmartUndo();
      loadData(App.state.month);
    });
    App.els.userButtons.appendChild(b);
  });
}

function renderFavorites(){
  App.els.favoriteButtons.innerHTML="";
  FAVORITES.forEach(f=>{
    if(!App.data.categories.some(c=>c.category===f.category)) return;
    const b=document.createElement("button");
    b.type="button";
    b.className="favorite-button"+(f.full?" full":"")+(f.category===App.state.category?" active":"");
    b.textContent=f.label;
    b.addEventListener("click", ()=>setCategory(f.category));
    App.els.favoriteButtons.appendChild(b);
  });
}

function renderCategories(){
  App.els.categorySelect.innerHTML="";
  App.data.categories.forEach(c=>{
    const o=document.createElement("option");
    o.value=c.category; o.textContent=c.category;
    App.els.categorySelect.appendChild(o);
  });
}

function restoreCategory(){
  const saved=App.state.category || localStorage.getItem("budgetTrackerLastCategory") || "SM";
  if(App.data.categories.some(c=>c.category===saved)){
    App.state.category=saved;
  }else if(App.data.categories.length){
    App.state.category=App.data.categories[0].category;
  }
  App.els.categorySelect.value=App.state.category;
}

function renderMiniDashboard(){
  const d=App.data.dashboard;
  if(!d) return;

  App.els.miniDashboard.classList.remove("hidden");
  App.els.miniRemaining.textContent=money(d.remainingAfterSpent);
  const pct=Math.round(d.spentPercent || 0);
  App.els.miniDashboardFill.style.width=Math.min(pct,100)+"%";
}

function renderPreview(){
  const item=App.data.categories.find(c=>c.category===App.state.category);
  if(!item) return;

  App.els.heroCard.classList.remove("hidden");
  App.els.previewCategory.textContent=item.category;
  App.els.previewBalance.textContent=money(item.balance);
  App.els.previewBudget.textContent=money(item.budget);
  App.els.previewSpent.textContent=money(item.totalSpent);

  const pct=item.budget>0 ? Math.min((item.totalSpent/item.budget)*100,100) : 0;
  App.els.progressFill.style.width=pct+"%";
  App.els.progressFill.className="progress-fill";
  if(item.totalSpent>item.budget) App.els.progressFill.classList.add("over");
  else if(pct>=90) App.els.progressFill.classList.add("danger");
  else if(pct>=70) App.els.progressFill.classList.add("warning");
}

function renderDashboard(){
  const d=App.data.dashboard;
  if(!d) return;

  App.els.dashboardCard.classList.remove("hidden");
  App.els.dashRemaining.textContent=money(d.remainingAfterSpent);
  App.els.dashIncome.textContent=money(d.totalIncome);
  App.els.dashExpenses.textContent=money(d.totalSpent);

  const pct=Math.round(d.spentPercent || 0);
  App.els.dashPercent.textContent=pct+"%";
  App.els.dashProgressFill.style.width=Math.min(pct,100)+"%";
  App.els.dashProgressFill.className="dash-progress-fill";
  if(pct>=90) App.els.dashProgressFill.classList.add("danger");
  else if(pct>=70) App.els.dashProgressFill.classList.add("warning");
}

function renderBudgetList(){
  App.els.budgetList.innerHTML="";
  App.data.categories.forEach(c=>{
    const pct=c.budget>0 ? Math.min((c.totalSpent/c.budget)*100,100) : 0;
    const row=document.createElement("div");
    row.className="budget-row";
    row.innerHTML=`<div class="budget-row-top"><div class="budget-row-title">${esc(c.category)}</div><div class="budget-row-balance">${money(c.balance)}</div></div><div class="budget-mini-track"><div class="budget-mini-fill" style="width:${pct}%"></div></div>`;
    row.addEventListener("click", ()=>{ setCategory(c.category); switchView("home"); });
    App.els.budgetList.appendChild(row);
  });
}

function renderSettings(){
  App.els.settingsMonth.textContent=App.state.month || "-";
  App.els.settingsUser.textContent=App.state.user || "-";
  App.els.createMonthBtn.textContent=App.data.nextMonth ? "Create "+App.data.nextMonth : "Create Next Month";
}

function submitExpense(){
  const user=App.state.user;
  const month=App.state.month;
  const category=App.els.categorySelect.value;
  const amount=App.els.amountInput.value;

  if(!user){ showMessage("Please choose user.","error",0); return; }
  if(!amount || Number(amount)<=0){ showMessage("Please enter a valid amount.","error"); return; }

  App.els.addBtn.disabled=true;
  App.els.addBtn.textContent="Saving...";

  api({action:"addExpense", user, month, category, amount})
    .then(r=>{
      App.els.amountInput.value="";
      App.state.category=category;
      localStorage.setItem("budgetTrackerLastCategory",category);
      saveSmartUndo({ user, month, category, amount:Number(r.amount), relatedId:r.ledgerId || "", timestamp:Date.now() });
      showMessage("Saved · "+money(r.amount)+" → "+r.category,"success");
      return loadData(month);
    })
    .catch(e=>showMessage(e.message,"error",0))
    .finally(()=>{
      App.els.addBtn.disabled=false;
      App.els.addBtn.textContent="Add Expense";
    });
}

function smartUndo(){
  const tx=getSmartUndo();

  if(!tx){
    renderSmartUndo();
    return;
  }

  if(!confirm("Undo "+money(tx.amount)+" from "+tx.category+"?")) return;

  App.els.undoBtn.disabled=true;
  App.els.undoBtn.textContent="Undoing...";

  api({action:"undoExpense", user:tx.user, month:tx.month, category:tx.category, amount:tx.amount, relatedId:tx.relatedId || ""})
    .then(r=>{
      clearSmartUndo();
      showMessage(r.message,"warning");
      return loadData(tx.month);
    })
    .catch(e=>showMessage(e.message,"error",0))
    .finally(()=>{
      App.els.undoBtn.disabled=false;
      App.els.undoBtn.textContent="Undo";
    });
}

function saveSmartUndo(tx){
  localStorage.setItem("familyBudgetSmartUndo", JSON.stringify(tx));
}

function getSmartUndo(){
  try{
    const raw=localStorage.getItem("familyBudgetSmartUndo");
    if(!raw) return null;

    const tx=JSON.parse(raw);
    if(!tx || !tx.amount) return null;
    if(tx.user!==App.state.user) return null;
    if(tx.month!==App.state.month) return null;

    return tx;
  }catch(e){
    return null;
  }
}

function clearSmartUndo(){
  localStorage.removeItem("familyBudgetSmartUndo");
}

function renderSmartUndo(){
  const tx=getSmartUndo();

  if(!tx){
    App.els.undoCard.classList.add("hidden");
    return;
  }

  App.els.undoCard.classList.remove("hidden");
  App.els.lastExpenseText.textContent=money(tx.amount)+" · "+tx.category+" · "+tx.user;
}



function renderHistoryFilters(){
  if(!App.data) return;
  if(App.els.historyMonthFilter){
    const currentValue = App.els.historyMonthFilter.value || "current";
    App.els.historyMonthFilter.innerHTML = "";
    addOption(App.els.historyMonthFilter, "current", "Current Month");
    addOption(App.els.historyMonthFilter, "", "All Months");
    (App.data.availableMonths || []).forEach(m => addOption(App.els.historyMonthFilter, m, m));
    App.els.historyMonthFilter.value = currentValue;
  }
  if(App.els.historyUserFilter){
    const currentValue = App.els.historyUserFilter.value || "current";
    App.els.historyUserFilter.innerHTML = "";
    addOption(App.els.historyUserFilter, "current", "Current User");
    addOption(App.els.historyUserFilter, "", "All Users");
    (App.data.users || []).forEach(u => addOption(App.els.historyUserFilter, u, u));
    App.els.historyUserFilter.value = currentValue;
  }
}
function addOption(select, value, label){
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}
function getHistoryFilters(){
  const monthValue = App.els.historyMonthFilter ? App.els.historyMonthFilter.value : "current";
  const userValue = App.els.historyUserFilter ? App.els.historyUserFilter.value : "current";
  return { month: monthValue === "current" ? App.state.month : monthValue, user: userValue === "current" ? App.state.user : userValue };
}
function loadTransactions(){
  const list = document.getElementById("transactionsList");
  const status = document.getElementById("transactionsStatus");
  if(!list || !status) return;
  const filters = getHistoryFilters();
  status.textContent = "Loading history...";
  list.innerHTML = '<div class="empty-state">Loading...</div>';
  api({ action:"getTransactions", month:filters.month || "", user:filters.user || "" })
    .then(r => {
      const items = r.transactions || [];
      updateHistorySummary(items);
      status.textContent = "Backend v" + (r.backendVersion || "?") + " · " + items.length + " ledger rows";
      renderTransactions(items);
    })
    .catch(e => {
      updateHistorySummary([]);
      status.textContent = "Error: " + e.message;
      list.innerHTML = '<div class="empty-state">History could not load.</div>';
    });
}
function updateHistorySummary(items){
  const count = items.length;
  const total = items.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  if(App.els.historyCount) App.els.historyCount.textContent = String(count);
  if(App.els.historyTotal) App.els.historyTotal.textContent = money(total);
}
function renderTransactions(items){
  const list = document.getElementById("transactionsList");
  if(!list) return;

  list.innerHTML = "";

  if(!items.length){
    list.innerHTML = '<div class="empty-state">No transactions for the selected filters.</div>';
    return;
  }

  items.forEach(tx => {
    const action = String(tx.action || "Added");
    const actionClass = action.toLowerCase();
    const row = document.createElement("div");
    row.className = "tx-row";
    row.innerHTML = `
      <div class="tx-main">
        <span class="tx-action ${actionClass}">${esc(action)}</span>
        <strong>${categoryIcon(tx.category)} ${esc(tx.category)}</strong>
        <span>👤 ${esc(tx.user)}<br>📅 ${formatDate(tx.date)} · ${esc(tx.month)}</span>
      </div>
      <div class="tx-side">
        <strong>${money(tx.amount)}</strong>
        <button class="tx-delete ${tx.canDelete ? "" : "hidden"}" type="button">Delete</button>
      </div>`;
    const btn = row.querySelector(".tx-delete");
    if(btn) btn.addEventListener("click", () => deleteTransaction(tx));
    list.appendChild(row);
  });
}

function deleteTransaction(tx){
  if(!confirm("Delete " + money(tx.amount) + " from " + tx.category + "?")) return;
  api({ action:"deleteTransaction", id:tx.id })
    .then(r => {
      clearSmartUndo();
      showMessage(r.message, "warning");
      return loadData(App.state.month).then(loadTransactions);
    })
    .catch(e => showMessage(e.message, "error", 0));
}
function categoryIcon(category){
  const c = String(category || "").toUpperCase();
  if(c.includes("SM")) return "🛒";
  if(c.includes("DELIVERY")) return "🍔";
  if(c.includes("ΡΟΥΧ") || c.includes("CLOTH")) return "👕";
  if(c.includes("WORK")) return "💼";
  if(c.includes("CAR") || c.includes("ΒΕΝΖ")) return "🚗";
  return "🧾";
}
function formatDate(value){
  if(!value) return "";
  const d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("el-GR", { day:"2-digit", month:"short" }) + " " + d.toLocaleTimeString("el-GR", { hour:"2-digit", minute:"2-digit" });
}
window.loadTransactions = loadTransactions;

function createNextMonth(){
  if(!App.data.latestMonth) return;

  const target=App.data.nextMonth || "next month";
  if(!confirm("Create "+target+" from "+App.data.latestMonth+"?")) return;

  App.els.createMonthBtn.disabled=true;
  App.els.createMonthBtn.textContent="Creating...";

  api({action:"createNextMonth", fromMonth:App.data.latestMonth})
    .then(r=>{
      App.state.month=r.month;
      clearSmartUndo();
      localStorage.setItem("budgetTrackerMonth",r.month);
      App.els.settingsMessage.textContent=r.message;
      return loadData(r.month);
    })
    .catch(e=>App.els.settingsMessage.textContent=e.message)
    .finally(()=>App.els.createMonthBtn.disabled=false);
}

function showMessage(text,type="success",timeout=2200){
  clearTimeout(App.toastTimer);
  App.els.message.textContent=text;
  App.els.message.className="toast "+type;
  App.els.message.classList.remove("hidden");

  if(timeout>0){
    App.toastTimer=setTimeout(()=>App.els.message.classList.add("hidden"),timeout);
  }
}

function money(v){ return "€"+Number(v||0).toFixed(2); }
function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }


/* Sprint 1.1.2 — Applied Dashboard Cards */
function applySprintDashboardCards(){
  if(!window.App || !App.data || !App.data.dashboard) return;

  const d = App.data.dashboard || {};
  const income = Number(d.totalIncome) || 0;
  const expenses = Number(d.totalSpent) || 0;
  const available = Number(d.remainingAfterSpent) || 0;

  const expensesPct = income > 0 ? Math.min(Math.round((expenses / income) * 100), 999) : 0;
  const availablePct = income > 0 ? Math.max(Math.round((available / income) * 100), 0) : 0;

  const html = `
    <section id="sprintDashboardCards" class="sprint-dashboard">
      <article class="dash-card dash-income">
        <div class="dash-accent"></div>
        <div class="dash-icon">💚</div>
        <div class="dash-value">${money(income)}</div>
        <div class="dash-label">Income</div>
        <div class="dash-meta">Monthly income</div>
      </article>

      <article class="dash-card dash-expenses">
        <div class="dash-accent"></div>
        <div class="dash-icon">🛍️</div>
        <div class="dash-value">${money(expenses)}</div>
        <div class="dash-label">Expenses</div>
        <div class="dash-meta">${expensesPct}% of income</div>
      </article>

      <article class="dash-card dash-available">
        <div class="dash-accent"></div>
        <div class="dash-icon">🏦</div>
        <div class="dash-value">${money(available)}</div>
        <div class="dash-label">Available</div>
        <div class="dash-meta">${availablePct}% remaining</div>
      </article>
    </section>
  `;

  const existing = document.getElementById("sprintDashboardCards");
  if(existing){
    existing.outerHTML = html;
    return;
  }

  // The current v6.6 home has a single summary card at the top.
  // We replace the first large card that contains the text "REMAINING THIS MONTH".
  const candidates = Array.from(document.querySelectorAll("section, .screen-card, .card, div"));
  const oldSummary = candidates.find(el => {
    const txt = (el.textContent || "").toUpperCase();
    return txt.includes("REMAINING THIS MONTH");
  });

  if(oldSummary){
    oldSummary.outerHTML = html;
    return;
  }

  // Fallback: insert after the header area.
  const main = document.querySelector("main") || document.body;
  main.insertAdjacentHTML("afterbegin", html);
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(applySprintDashboardCards, 500);
});
