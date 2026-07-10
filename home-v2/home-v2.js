const $ = (id) => document.getElementById(id);

function money(value){
  const n = Number(value) || 0;
  return "€" + n.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function api(params){
  return new Promise((resolve, reject) => {
    const callback = "fbv2_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const url = new URL(window.FB_CONFIG.API_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
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
      if(!data || data.success === false) reject(new Error(data?.error || "API error"));
      else resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("API request failed"));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function renderSummary(data){
  const d = data.dashboard || {};
  const income = Number(d.totalIncome) || 0;
  const expenses = Number(d.totalSpent) || 0;
  const available = Number(d.remainingAfterSpent) || 0;

  const expensesPct = income > 0 ? Math.min(Math.round((expenses / income) * 100), 999) : 0;
  const availablePct = income > 0 ? Math.max(Math.round((available / income) * 100), 0) : 0;

  $("incomeValue").textContent = money(income);
  $("expensesValue").textContent = money(expenses);
  $("availableValue").textContent = money(available);
  $("expensesMeta").textContent = expensesPct + "% of income";
  $("availableMeta").textContent = availablePct + "% remaining";
  $("monthPill").textContent = data.selectedMonth || data.latestMonth || "Month";
}


let selectedCategory = "";

function renderQuickCategories(data){
  const container = $("quickCategories");
  if(!container) return;

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const items = categories.map(c => String(c.category || "").trim()).filter(Boolean).slice(0, 8).map(name => ({
    internal: name,
    display: displayName(name),
    icon: categoryIcon(name)
  }));

  container.innerHTML = "";

  if(!items.length){
    container.innerHTML = '<button class="chip active"><span>!</span><strong>No data</strong></button>';
    return;
  }

  selectedCategory = selectedCategory || items[0].internal;

  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (item.internal === selectedCategory ? " active" : "");
    button.dataset.category = item.internal;
    button.innerHTML = `<span>${item.icon}</span><strong>${escapeHtml(item.display)}</strong>`;
    button.addEventListener("click", () => {
      selectedCategory = item.internal;
      renderQuickCategories(data);
    });
    container.appendChild(button);
  });

  const more = document.createElement("button");
  more.type = "button";
  more.className = "chip";
  more.innerHTML = "<span>•••</span><strong>More</strong>";
  container.appendChild(more);
}

function displayName(name){
  const n = String(name || "").trim();
  const u = n.toUpperCase();
  if(u === "SM" || u.includes("SUPER")) return "SM";
  if(u.includes("DELIVERY")) return "Delivery";
  if(u.includes("WORK") && u.includes("ΧΡΗΣ")) return "Work Χ";
  if(u.includes("WORK") && u.includes("ΓΙΑΝ")) return "Work Γ";
  if(u.includes("WORK")) return "Work";
  if(u.includes("HAIR")) return "Hair";
  if(u.includes("CAR")) return "Car";
  if(u.includes("COSMOTE")) return "Cosmote";
  if(u.includes("VODAFONE")) return "Vodafone";
  if(u.includes("ADOBE")) return "Adobe";
  return n.length > 9 ? n.slice(0, 8) : n;
}

function categoryIcon(name){
  const u = String(name || "").toUpperCase();
  if(u === "SM" || u.includes("SUPER")) return "🛒";
  if(u.includes("DELIVERY")) return "🍔";
  if(u.includes("WORK")) return "💼";
  if(u.includes("CAR")) return "🚗";
  if(u.includes("HAIR")) return "💅";
  if(u.includes("COSMOTE") || u.includes("VODAFONE")) return "📱";
  if(u.includes("ADOBE")) return "🎨";
  return "🧾";
}

function escapeHtml(value){
  return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function load(){
  try{
    $("monthPill").textContent = "Loading...";
    const data = await api({ action: "getAppData", user: window.FB_CONFIG.DEFAULT_USER || "" });
    renderSummary(data);
    renderQuickCategories(data);
  }catch(err){
    $("monthPill").textContent = "Error";
    console.error(err);
  }
}

load();
