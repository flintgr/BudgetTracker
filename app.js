const FAVORITES = [
  { label: "🛒 SM", category: "SM" },
  { label: "🍔 DELIVERY", category: "DELIVERY" },
  { label: "💼 WORK ΓΙΑΝΝΑ", category: "WORK ΓΙΑΝΝΑ" },
  { label: "💼 WORK ΧΡΗΣΤΟΣ", category: "WORK ΧΡΗΣΤΟΣ" },
  { label: "👕 ΡΟΥΧΑ", category: "ΡΟΥΧΑ", full: true }
];

const App = {
  data: null,
  state: {
    month: "",
    user: "",
    category: "",
    view: "home"
  },
  els: {}
};

window.addEventListener("load", init);

function init() {
  cacheElements();
  bindEvents();

  if (!API_URL || API_URL.includes("PASTE_YOUR")) {
    showMessage("Set API_URL in config.js first.", "error");
    return;
  }

  App.state.month = localStorage.getItem("budgetTrackerMonth") || "";
  App.state.user = localStorage.getItem("budgetTrackerUser") || "";
  App.state.category = localStorage.getItem("budgetTrackerLastCategory") || "SM";

  loadData(App.state.month);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function cacheElements() {
  App.els.monthButton = document.getElementById("monthButton");
  App.els.monthMenu = document.getElementById("monthMenu");
  App.els.setupCard = document.getElementById("setupCard");
  App.els.userSelect = document.getElementById("userSelect");
  App.els.continueBtn = document.getElementById("continueBtn");
  App.els.mainApp = document.getElementById("mainApp");
  App.els.bottomNav = document.getElementById("bottomNav");
  App.els.views = {
    home: document.getElementById("viewHome"),
    budget: document.getElementById("viewBudget"),
    dashboard: document.getElementById("viewDashboard"),
    settings: document.getElementById("viewSettings")
  };
  App.els.navButtons = Array.from(document.querySelectorAll(".nav-btn"));
  App.els.dashboardCard = document.getElementById("dashboardCard");
  App.els.dashRemaining = document.getElementById("dashRemaining");
  App.els.dashPercent = document.getElementById("dashPercent");
  App.els.dashProgressFill = document.getElementById("dashProgressFill");
  App.els.dashIncome = document.getElementById("dashIncome");
  App.els.dashExpenses = document.getElementById("dashExpenses");
  App.els.userButtons = document.getElementById("userButtons");
  App.els.favoriteButtons = document.getElementById("favoriteButtons");
  App.els.heroCard = document.getElementById("heroCard");
  App.els.previewCategory = document.getElementById("previewCategory");
  App.els.previewBalance = document.getElementById("previewBalance");
  App.els.previewBudget = document.getElementById("previewBudget");
  App.els.previewSpent = document.getElementById("previewSpent");
  App.els.progressFill = document.getElementById("progressFill");
  App.els.categorySelect = document.getElementById("categorySelect");
  App.els.amountInput = document.getElementById("amountInput");
  App.els.addBtn = document.getElementById("addBtn");
  App.els.message = document.getElementById("message");
  App.els.undoCard = document.getElementById("undoCard");
  App.els.lastExpenseText = document.getElementById("lastExpenseText");
  App.els.undoBtn = document.getElementById("undoBtn");
  App.els.budgetList = document.getElementById("budgetList");
  App.els.settingsMonth = document.getElementById("settingsMonth");
  App.els.settingsUser = document.getElementById("settingsUser");
  App.els.createMonthBtn = document.getElementById("createMonthBtn");
  App.els.settingsMessage = document.getElementById("settingsMessage");
}

function bindEvents() {
  App.els.monthButton.addEventListener("click", () => {
    App.els.monthMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".month-picker")) {
      App.els.monthMenu.classList.add("hidden");
    }
  });

  App.els.navButtons.forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  App.els.categorySelect.addEventListener("change", () => {
    setCategory(App.els.categorySelect.value);
  });

  App.els.continueBtn.addEventListener("click", () => {
    setUser(App.els.userSelect.value);
    showMain();
    renderUsers();
    renderPreview();
    focusAmount();
  });

  App.els.addBtn.addEventListener("click", submitExpense);
  App.els.undoBtn.addEventListener("click", undoLastExpense);
  App.els.createMonthBtn.addEventListener("click", createNextMonth);

  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && document.activeElement === App.els.amountInput) {
      event.preventDefault();
      submitExpense();
    }
  });
}

function switchView(viewName) {
  App.state.view = viewName;

  Object.entries(App.els.views).forEach(([name, el]) => {
    el.classList.toggle("active-view", name === viewName);
  });

  App.els.navButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  if (viewName === "home") focusAmount();
}

function loadData(month) {
  const params = { action: "getAppData", user: App.state.user || "" };
  if (month) params.month = month;

  apiCall(params)
    .then(data => {
      App.data = data;
      App.state.month = data.selectedMonth;
      localStorage.setItem("budgetTrackerMonth", App.state.month);

      if (!App.state.user && data.users.length > 0) {
        App.state.user = localStorage.getItem("budgetTrackerUser") || "";
      }

      renderAll();
    })
    .catch(error => showMessage(error.message, "error"));
}

function renderAll() {
  renderMonths();
  renderSetupUsers();
  renderCategories();

  if (App.state.user) showMain();
  else showSetup();

  restoreCategoryIfPossible();
  renderDashboard();
  renderBudgetList();
  renderSettings();
  renderUsers();
  renderFavorites();
  renderPreview();
  renderUndo();
  switchView(App.state.view);
  focusAmount();
}

function renderDashboard() {
  if (!App.data || !App.data.dashboard) return;

  const dash = App.data.dashboard;

  App.els.dashboardCard.classList.remove("hidden");
  App.els.dashRemaining.textContent = formatMoney(dash.remainingAfterSpent);
  App.els.dashIncome.textContent = formatMoney(dash.totalIncome);
  App.els.dashExpenses.textContent = formatMoney(dash.totalSpent);

  const pct = Math.round(Number(dash.spentPercent) || 0);
  App.els.dashPercent.textContent = pct + "%";

  App.els.dashProgressFill.style.width = Math.min(pct, 100) + "%";
  App.els.dashProgressFill.className = "dash-progress-fill";

  if (pct >= 90) App.els.dashProgressFill.classList.add("danger");
  else if (pct >= 70) App.els.dashProgressFill.classList.add("warning");
}

function renderBudgetList() {
  App.els.budgetList.innerHTML = "";

  App.data.categories.forEach(item => {
    const budget = Number(item.budget) || 0;
    const spent = Number(item.totalSpent) || 0;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

    const row = document.createElement("div");
    row.className = "budget-row";
    row.innerHTML = `
      <div class="budget-row-top">
        <div class="budget-row-title">${escapeHtml(item.category)}</div>
        <div class="budget-row-balance">${formatMoney(item.balance)}</div>
      </div>
      <div class="budget-mini-track">
        <div class="budget-mini-fill" style="width:${pct}%"></div>
      </div>
    `;
    row.addEventListener("click", () => {
      setCategory(item.category);
      switchView("home");
    });
    App.els.budgetList.appendChild(row);
  });
}

function renderSettings() {
  App.els.settingsMonth.textContent = App.state.month || "-";
  App.els.settingsUser.textContent = App.state.user || "-";

  if (App.data && App.data.nextMonth) {
    App.els.createMonthBtn.textContent = "Create " + App.data.nextMonth;
  } else {
    App.els.createMonthBtn.textContent = "Create Next Month";
  }
}


function renderUndo() {
  const tx = App.data && App.data.lastTransaction;

  if (!tx || !tx.amount) {
    App.els.undoCard.classList.add("hidden");
    return;
  }

  App.els.undoCard.classList.remove("hidden");
  App.els.lastExpenseText.textContent = formatMoney(tx.amount) + " · " + tx.category + " · " + tx.user;
}

function undoLastExpense() {
  if (!App.state.user || !App.state.month) return;

  const ok = confirm("Undo last expense for " + App.state.user + "?");
  if (!ok) return;

  App.els.undoBtn.disabled = true;
  App.els.undoBtn.textContent = "Undoing...";

  apiCall({ action: "undoLastExpense", user: App.state.user, month: App.state.month })
    .then(result => {
      showMessage(result.message, "warning");
      return loadData(App.state.month);
    })
    .catch(error => showMessage(error.message, "error"))
    .finally(() => {
      App.els.undoBtn.disabled = false;
      App.els.undoBtn.textContent = "Undo";
    });
}

function createNextMonth() {
  if (!App.data || !App.data.latestMonth) return;

  const sourceMonth = App.data.latestMonth;
  const targetMonth = App.data.nextMonth || "next month";
  const ok = confirm("Create " + targetMonth + " from " + sourceMonth + "?");

  if (!ok) return;

  App.els.createMonthBtn.disabled = true;
  App.els.createMonthBtn.textContent = "Creating...";

  apiCall({ action: "createNextMonth", fromMonth: sourceMonth })
    .then(result => {
      App.state.month = result.month;
      localStorage.setItem("budgetTrackerMonth", result.month);
      App.els.settingsMessage.textContent = result.message;
      return loadData(result.month);
    })
    .catch(error => {
      App.els.settingsMessage.textContent = error.message;
    })
    .finally(() => {
      App.els.createMonthBtn.disabled = false;
    });
}

function renderMonths() {
  App.els.monthButton.textContent = App.state.month || "Month";
  App.els.monthMenu.innerHTML = "";

  App.data.availableMonths.forEach(month => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-option" + (month === App.state.month ? " active" : "");
    button.textContent = month;
    button.addEventListener("click", () => {
      App.state.month = month;
      App.state.category = "SM";
      localStorage.setItem("budgetTrackerMonth", month);
      localStorage.setItem("budgetTrackerLastCategory", "SM");
      App.els.monthMenu.classList.add("hidden");
      showMessage("Loading " + month + "...", "success");
      loadData(month);
    });
    App.els.monthMenu.appendChild(button);
  });
}

function renderSetupUsers() {
  App.els.userSelect.innerHTML = "";

  App.data.users.forEach(user => {
    const option = document.createElement("option");
    option.value = user;
    option.textContent = user;
    App.els.userSelect.appendChild(option);
  });
}

function renderUsers() {
  App.els.userButtons.innerHTML = "";

  App.data.users.forEach(user => {
    const button = document.createElement("button");
    button.className = "user-button" + (user === App.state.user ? " active" : "");
    button.textContent = "👤 " + user;
    button.addEventListener("click", () => {
      setUser(user);
      renderUsers();
      renderSettings();
      focusAmount();
    });
    App.els.userButtons.appendChild(button);
  });
}

function renderFavorites() {
  App.els.favoriteButtons.innerHTML = "";

  FAVORITES.forEach(fav => {
    const exists = App.data.categories.some(item => item.category === fav.category);
    if (!exists) return;

    const button = document.createElement("button");
    button.className = "favorite-button" + (fav.full ? " full" : "") + (fav.category === App.state.category ? " active" : "");
    button.textContent = fav.label;
    button.addEventListener("click", () => setCategory(fav.category));
    App.els.favoriteButtons.appendChild(button);
  });
}

function setUser(user) {
  App.state.user = user;
  localStorage.setItem("budgetTrackerUser", user);
}

function setCategory(category) {
  App.state.category = category;
  App.els.categorySelect.value = category;
  localStorage.setItem("budgetTrackerLastCategory", category);
  renderFavorites();
  renderPreview();
  focusAmount();
}

function renderCategories() {
  App.els.categorySelect.innerHTML = "";

  App.data.categories.forEach(item => {
    const option = document.createElement("option");
    option.value = item.category;
    option.textContent = item.category;
    App.els.categorySelect.appendChild(option);
  });
}

function restoreCategoryIfPossible() {
  const saved = App.state.category || localStorage.getItem("budgetTrackerLastCategory") || "SM";
  const exists = App.data.categories.some(item => item.category === saved);

  if (exists) {
    App.state.category = saved;
    App.els.categorySelect.value = saved;
  } else if (App.data.categories.length > 0) {
    App.state.category = App.data.categories[0].category;
    App.els.categorySelect.value = App.state.category;
  }
}

function renderPreview() {
  if (!App.data || !App.state.category) return;

  const item = App.data.categories.find(c => c.category === App.state.category);
  if (!item) return;

  App.els.heroCard.classList.remove("hidden");
  App.els.previewCategory.textContent = item.category;
  App.els.previewBudget.textContent = formatMoney(item.budget);
  App.els.previewSpent.textContent = formatMoney(item.totalSpent);
  App.els.previewBalance.textContent = formatMoney(item.balance);

  renderProgress(item);
}

function renderProgress(item) {
  const budget = Number(item.budget) || 0;
  const spent = Number(item.totalSpent) || 0;

  let percent = 0;
  if (budget > 0) percent = Math.min((spent / budget) * 100, 100);

  App.els.progressFill.style.width = percent + "%";
  App.els.progressFill.className = "progress-fill";

  if (budget > 0 && spent > budget) App.els.progressFill.classList.add("over");
  else if (percent >= 90) App.els.progressFill.classList.add("danger");
  else if (percent >= 70) App.els.progressFill.classList.add("warning");
}

function showSetup() {
  App.els.setupCard.classList.remove("hidden");
  App.els.mainApp.classList.add("hidden");
  App.els.bottomNav.classList.add("hidden");
}

function showMain() {
  App.els.setupCard.classList.add("hidden");
  App.els.mainApp.classList.remove("hidden");
  App.els.bottomNav.classList.remove("hidden");
}

function submitExpense() {
  const amount = App.els.amountInput.value;
  const category = App.els.categorySelect.value;
  const month = App.els.monthSelect.value;
  const user = App.state.user;

  if (!user) {
    showMessage("Please choose user.", "error");
    return;
  }

  if (!amount || Number(amount) <= 0) {
    showMessage("Please enter a valid amount.", "error");
    focusAmount();
    return;
  }

  App.state.category = category;
  App.state.month = month;

  localStorage.setItem("budgetTrackerLastCategory", category);
  localStorage.setItem("budgetTrackerMonth", month);

  App.els.addBtn.disabled = true;
  App.els.addBtn.textContent = "Saving...";

  apiCall({ action: "addExpense", user, category, amount, month })
    .then(result => {
      App.els.amountInput.value = "";
      showMessage("Saved · " + formatMoney(result.amount) + " → " + result.category + " · " + result.month, result.balance < 0 ? "warning" : "success");
      return reloadAfterSave(month, category);
    })
    .catch(error => showMessage(error.message, "error"))
    .finally(() => {
      App.els.addBtn.disabled = false;
      App.els.addBtn.textContent = "Add Expense";
    });
}

function reloadAfterSave(month, category) {
  return apiCall({ action: "getAppData", month })
    .then(data => {
      App.data = data;
      App.state.month = data.selectedMonth;
      App.state.category = category;
      renderMonths();
      renderSetupUsers();
      renderCategories();
      App.els.categorySelect.value = category;
      renderDashboard();
      renderBudgetList();
      renderSettings();
      renderUsers();
      renderFavorites();
      renderPreview();
      renderUndo();
      focusAmount();
    });
}

function apiCall(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "bt_cb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    params.callback = callbackName;

    const url = API_URL + "?" + new URLSearchParams(params).toString();
    const script = document.createElement("script");

    window[callbackName] = data => {
      delete window[callbackName];
      script.remove();

      if (data && data.success === false) reject(new Error(data.error || "Unknown error"));
      else resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Network error"));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

function focusAmount() {
  if (App.state.view !== "home") return;
  setTimeout(() => {
    if (App.els.amountInput) App.els.amountInput.focus();
  }, 250);
}

function showMessage(text, type) {
  App.els.message.textContent = text;
  App.els.message.className = "toast " + type;
  App.els.message.classList.remove("hidden");
}

function formatMoney(value) {
  return "€" + Number(value).toFixed(2);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
