const FAVORITES = [
  { label: "🛒 SM", category: "SM" },
  { label: "🍔 DELIVERY", category: "DELIVERY" },
  { label: "💼 WORK ΓΙΑΝΝΑ", category: "WORK ΓΙΑΝΝΑ" },
  { label: "💼 WORK ΧΡΗΣΤΟΣ", category: "WORK ΧΡΗΣΤΟΣ" },
  { label: "👕 ΡΟΥΧΑ", category: "ΡΟΥΧΑ", full: true }
];

const APP_VERSION = "Sprint 1.3";
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
    b.className="quick-chip"+(f.category===App.state.category?" active":"");
    const parts = String(f.label || f.category).split(" ");
    const icon = parts[0] || "🧾";
    const label = parts.slice(1).join(" ") || f.category;
    b.innerHTML = `<span>${esc(icon)}</span><strong>${esc(label)}</strong>`;
    b.addEventListener("click", ()=>{
      setCategory(f.category);
      setTimeout(()=>App.els.amountInput && App.els.amountInput.focus(), 50);
    });
    App.els.favoriteButtons.appendChild(b);
  });

  const more=document.createElement("button");
  more.type="button";
  more.className="quick-chip more-chip";
  more.innerHTML="<span>•••</span><strong>More</strong>";
  more.addEventListener("click", ()=>{
    App.els.categorySelect.focus();
    const adv=document.querySelector(".home-v2-advanced");
    if(adv) adv.open=true;
  });
  App.els.favoriteButtons.appendChild(more);
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
