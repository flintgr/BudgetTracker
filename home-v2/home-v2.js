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
    "art": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 17.9 18.2\"> <path d=\"M10.5,0h-.8c.3.1.5.2.8.4.9.5,1.8,1.2,2.5,2,.7.9,1.3,1.9,1.7,3,.4,1.2.6,2.4.6,3.7s-.2,2.5-.6,3.7c-.4,1.1-.9,2.1-1.7,3-.7.9-1.6,1.6-2.5,2-.3.1-.5.3-.8.4h.8c4.1,0,7.4-4.1,7.4-9.1S14.6,0,10.5,0Z\"/> <path d=\"M14.8,9.1C14.8,4.1,11.5,0,7.4,0S0,4.1,0,9.1s3.3,9.1,7.4,9.1,7.4-4.1,7.4-9.1ZM13.6,13.4c0,.1-.2.2-.3,0,0,0-.1-.2,0-.3,0-.1.2-.2.3,0,0,0,.1.2,0,.3ZM14.2,7.4c.1,0,.2,0,.2.2s0,.2-.2.3c-.1,0-.2,0-.2-.2s0-.2.2-.3ZM14.1,10.5c0-.1.1-.2.2-.2s.2.1.2.3-.1.2-.2.2-.2-.1-.2-.3ZM13.3,4.6h.3v.3h-.3v-.3ZM11.7,2.4s.2,0,.3,0v.3s-.2,0-.3,0,0-.2,0-.3ZM9.6,1c0-.1.1-.2.2-.1,0,0,.2.2.1.3,0,.1-.1.2-.2.1,0,0-.2-.2-.1-.3ZM7.2.6h0v-.2h0s.2,0,.2.2h0c0,.1,0,.2-.2.2s0,0,0,0h0c0-.1,0-.2,0-.2ZM4.9,1h0q0-.1,0,0h0s0,.2,0,.2h-.2l.3-.2ZM2.8,2.4h.3v.3h-.3v-.3ZM1.2,4.7c0,0,.2-.2.3,0,0,0,.1.2,0,.3,0,0-.2.2-.3,0,0,0-.1-.2,0-.3ZM.6,10.8c-.1,0-.2,0-.2-.2s0-.2.2-.3.2,0,.2.2,0,.2-.2.3ZM.8,7.6c0,0-.1.2-.2.2s-.2,0-.2-.3.1-.2.2-.2.2,0,.2.3ZM1.5,13.5h-.3v-.3h.3v.3ZM3.1,15.7s-.2.1-.3,0v-.3s.2-.1.3,0v.3ZM5.2,17.1c0,.1,0,.2-.2.1,0,0-.2-.2,0-.3,0-.1,0-.2.2-.1,0,0,.2.2,0,.3ZM7.6,17.6c0,.1,0,.2-.2.2s0,0-.2-.1h0v-.3h0s.2,0,.2.2h0ZM9.9,17.3h0s-.1,0-.2-.1h0s0,.2-.1.2h.3ZM10,16.4c-.8.4-1.7.6-2.5.6s-1.7-.2-2.5-.6-1.5-1-2.1-1.7c-1.2-1.5-1.9-3.5-1.9-5.6s.7-4.1,1.9-5.6c.6-.7,1.3-1.3,2.1-1.7.8-.4,1.7-.6,2.5-.6s1.7.2,2.5.6c.8.4,1.5,1,2.1,1.7,1.2,1.5,1.9,3.5,1.9,5.6s-.7,4.1-1.9,5.6c-.6.7-1.3,1.3-2.1,1.7ZM12,15.8h-.3v-.3h.3v.3Z\"/> <path d=\"M7.4,1.4c-3.4,0-6.2,3.5-6.2,7.7s2.8,7.6,6.2,7.6,6.2-3.4,6.2-7.6S10.8,1.4,7.4,1.4ZM7.9,13.9c-.9,0-1.6-.4-2.1-1.3-.4-.6-.7-1.4-.8-2.5h-.7v-.7h.6v-.8h-.6v-.7h.7c0-1,.4-1.8.9-2.4.5-.8,1.2-1.2,2.1-1.2s1.1.2,1.4.5l-.2.9c-.3-.2-.7-.4-1.2-.4s-1,.3-1.4.8c-.3.4-.5,1.1-.6,1.8h3v.7h-3v.9h3.1v.7h-3c0,.8.3,1.5.6,1.9.4.6.9.8,1.5.8s1-.3,1.3-.5l.2.9c-.3.3-.9.6-1.6.6h-.2Z\"/> </svg>",
    "beauty": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 13 20.8\"> <path d=\"M2.5,2c0-.7,0-1.5.6-2,.3.5.5,1,.7,1.6,1.5,3.7,3,7.5,4.5,11.2.2.4.3.9.8,1.2.5.2,1,.2,1.5.4,1.1.5,1.7,1.8,1.5,3,0,.6-.5,1-.7,1.5,0,.4.5.7.9.8.2,0,.6,0,.7.3.1.3,0,.7-.4.8-.5.1-1,0-1.4-.2s-.7-.6-1.1-1c-.5,0-1.1,0-1.6-.2-1-.4-1.7-1.6-1.6-2.7,0-.8.7-1.5.5-2.3-.2-.7-.4-1.5-1-1.9-.2,0-.4-.2-.5-.1-.6.3-.9,1-1.1,1.6,0,.5-.2,1,0,1.4.3.5.5,1.1.4,1.7,0,1.4-1.4,2.5-2.7,2.4C1.1,19.5,0,18.1,0,16.7c0-1.2.9-2.3,2.1-2.5.4,0,.8,0,1.1-.4.3-.3.5-.8.6-1.2.2-.6.5-1.2.7-1.8v-.8c-.4-1.4-.7-2.8-1.1-4.2-.3-1.2-.7-2.5-.8-3.8h0ZM5.7,9.9c-.4.1-.4.8,0,.9.3.2.8-.2.7-.6,0-.3-.4-.5-.7-.4h0ZM2.1,15.3c-.5.2-.9.6-1,1.1-.2.8.4,1.8,1.3,1.8,1,.1,1.8-.9,1.6-1.8,0-.8-1.1-1.4-1.9-1.1h0ZM9,15.3c-.6.2-1,.7-1,1.3,0,.9.7,1.7,1.6,1.6.8,0,1.4-.7,1.4-1.5s-1-1.8-1.9-1.4h-.1Z\"/> <path d=\"M8,1.9c.3-.6.5-1.3.8-1.9.6.4.6,1.2.6,1.9-.1,1.7-.6,3.2-1,4.8-.2.9-.4,1.8-.7,2.6-.4-.7-.6-1.5-.9-2.2,0-.4-.4-.9-.2-1.3.5-1.3,1.1-2.6,1.5-4h-.1Z\"/> </svg>",
    "car": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 22.8 9\"> <path d=\"M21.7,6.1h-.7c-.1,0-.2,0-.2,0-.3-.8-.9-1.3-1.8-1.5-1.2-.2-2.3.3-2.8,1.4,0,0-.1.2-.2.2H6.7q0,0-.2,0c-.4-.8-.9-1.2-1.7-1.4-1.2-.3-2.4.3-2.8,1.4,0,0,0,0-.1,0H.2q0,0,0,0v-1.4c.2-.2.3-.5.3-.8,0-.5,0-.9.4-1.2,0,0,.1-.2.2-.3.3-.4.6-.8,1-1.1,0,0,0,0,.2-.1.8-.3,1.6-.5,2.4-.7s1.6-.3,2.4-.4h3.4c1.4,0,2.8.4,4.2.9.9.4,1.8.9,2.7,1.3.6.3,1.1.4,1.7.6.7.2,1.5.3,2.2.6s1.1.7,1.4,1.4c.2.4.2.9.2,1.3h-1.1ZM7.5,2.7h1.9c.1,0,.2,0,.2-.2v-.9c0-.4,0-.7-.1-1.1,0,0,0-.1-.1-.1-.9,0-1.9,0-2.8.2-1.2.2-2.2.6-3.3,1.2,0,0-.3,0-.3.2s.2.2.3.2c.8.3,1.6.4,2.5.5h1.8,0ZM16.8,2.7c-.3-.2-.6-.3-.8-.4-1-.6-2.1-1.1-3.2-1.4-.8-.2-1.6-.4-2.5-.4s-.2,0-.1.1c0,.6.2,1.3.2,1.9s0,.2.2.2h6.2ZM21.4,4.4h.3s.1,0,0,0c0,0-.2-.2-.3-.4h-.1c-.1,0-.2,0-.3,0-.5-.2-1.1-.3-1.7-.4-.1,0-.2,0-.2,0s0,0,.1,0c.4,0,.7.3,1,.5s.7.3,1.1.3h.1ZM.5,4c.1,0,.3,0,.4,0,.4,0,.8-.3,1.2-.5h0,0c-.3,0-.5,0-.8,0h-.7s-.1,0-.1,0v.8-.2Z\"/> <path d=\"M6.1,7c0,1-.7,2-2,2s-1.9-.8-1.9-1.9.7-2,2-2,2,1,1.9,1.9ZM4.1,7.4c.3,0,.5-.2.5-.4s-.2-.5-.5-.4c-.2,0-.4.2-.4.5s.2.4.4.4h0Z\"/> <path d=\"M20.5,7c0,.9-.6,1.9-1.9,1.9s-2-1-2-2,.7-1.9,1.9-1.9,2,1,2,1.9h0ZM19,7c0-.2-.2-.5-.5-.5s-.4.2-.4.4.2.4.4.4c.3,0,.5-.2.5-.4h0Z\"/> <path d=\"M11.4,6.5h4.6c.1,0,.2,0,.1.2v.6H6.7v-.7q0,0,0,0h4.6,0Z\"/> <path d=\"M.8,6.5h.8s.1,0,0,0v.7s0,0,0,0c-.5,0-1-.2-1.4-.4-.2,0-.2-.3-.2-.4h.8,0Z\"/> <path d=\"M22.5,6.5c0,.3-.2.5-.5.6s-.6.2-1,.3c0,0-.1,0-.1,0v-.7h0c.5,0,.9,0,1.4,0h.2Z\"/> </svg>",
    "cart": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 20.7 15.7\"> <path d=\"M20.7,3.4c-.1-.2-.3-.3-.5-.3H4.8l-.7-2.6c0-.3-.3-.5-.6-.5H.7c-.4,0-.7.3-.7.7s.3.7.7.7h2.4l2.7,10.3c0,.3.3.5.6.5h.4c-.2.3-.3.7-.3,1.1,0,1.3,1.1,2.4,2.4,2.4s2.4-1.1,2.4-2.4-.1-.8-.3-1.1h2.5c-.2.3-.3.7-.3,1.1,0,1.3,1.1,2.4,2.4,2.4s2.4-1.1,2.4-2.4-.1-.8-.3-1.1h.4c.3,0,.6-.2.6-.5l2-7.7c0-.2,0-.4-.1-.6h.1ZM7.5,6.3c0-.4.3-.7.7-.7h8.2c.4,0,.7.3.7.7s-.3.7-.7.7h-8.2c-.4,0-.7-.3-.7-.7ZM10,13.3c0,.6-.5,1.1-1.1,1.1s-1.1-.5-1.1-1.1.5-1.1,1.1-1.1,1.1.5,1.1,1.1ZM16.8,13.3c0,.6-.5,1.1-1.1,1.1s-1.1-.5-1.1-1.1.5-1.1,1.1-1.1,1.1.5,1.1,1.1Z\"/> </svg>",
    "delivery": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 21.4 17.7\"> <path d=\"M10,0c.5,0,1,0,1.4.3s.7.7.8,1.1v.2c.2.1.5.2.7.3v.2c0,0-.2.2-.4.2h-1.4c.3,0,.5.2.8.2,0,.4-.2.7-.4,1s-.5.4-.8.4-.4,0-.5,0c-.4-.2-.9-.3-1.3-.5-.1,0-.2,0-.3-.3-.2-.3-.3-.6-.3-.9,0-.5.1-1.1.5-1.5C9.1.3,9.5.1,9.9,0h0ZM8.7,3.9c.2,0,.5-.2.7,0,.3,0,.5.2.7.3.1,0,.3.2.4.4.4.6.9,1.2,1.3,1.8h0c.8.2,1.7.4,2.5.6.2,0,.3,0,.4.3v.5c0,.2-.3.3-.5.3h-.5c-.7,0-1.4-.2-2.1-.3-.2,0-.4,0-.6,0-.2,0-.3-.2-.5-.3-.3-.4-.7-.7-1-1.1h0c.2.3.4.7.7,1v.5c0,.3-.1.7-.2,1,.4,0,.8.1,1.1.2.4,0,.7.1,1.1.2.2,0,.4,0,.7.1.4.2.7.6.7,1v3.4h.4c.2,0,.4,0,.6.3.1.1.1.3,0,.5,0,.1-.2.2-.4.2h-1.6c-.2,0-.4-.1-.4-.3,0-1.2-.2-2.3-.2-3.5-.7,0-1.4,0-2.2-.1h-1.1c-.4,0-.8-.1-1-.4-.3-.3-.4-.7-.4-1.1s0-.5,0-.7c.2-1.1.4-2.1.6-3.1,0-.4.3-.8.7-1.1h0v-.4ZM.7,4.4h5.4c.4,0,.7.3.7.7v4.6c0,.1,0,.3,0,.4,0,.2-.4.3-.6.3H.5c-.3,0-.5-.3-.5-.6,0-1.7,0-3.2,0-4.7s.3-.6.6-.7h0ZM3.2,5.8v.4c-.4,0-.9.3-1.2.6-.4.4-.6,1-.6,1.5h4c0-.5-.2-.9-.4-1.3-.3-.4-.8-.7-1.3-.8,0,0,.2-.3,0-.5s-.5-.2-.6,0h.1ZM1,8.6v.2c0,.1.2.3.4.2h4.2c0,0,.2,0,.3-.1v-.3H.9h0ZM14.2,4.4h.3c.2.2.3.4.3.7h0c.2.3.3.6.3.9s0,.4.1.6h.3c.4,0,.8,0,1.2,0,.2,0,.4.2.4.4v1.1c0,.2,0,.3-.2.4h-.6c0,.1.2.2.3.3.4.4.8.9,1.1,1.4.3.5.5,1,.5,1.5.5,0,1.1,0,1.6.2s1,.6,1.2,1.1v.3h-.5c-.4,0-.8-.2-1.3-.2-.9,0-1.7.3-2.3,1-.3.3-.5.7-.7,1-.2.3-.4.5-.7.7s-.7.3-1.1.3h-6.2c-.2,0-.5-.1-.6-.3-.2-.3-.2-.6-.3-1H2.1s-.2,0-.2-.1v-.3c.2-.9.7-1.7,1.5-2.2,0-.1.3-.2.5-.3,0-.1,0-.3,0-.4H1.1c-.2,0-.3,0-.3-.2v-.5s.2-.1.3-.1h9.7c.1.1.2.3.1.4,0,.2-.1.4-.3.5-.3.3-.5.7-.5,1.1s0,.8.2,1.1.4.5.6.6c.2,0,.4.1.6.1h2.2c.3,0,.6-.2.9-.4.2-.2.4-.6.5-.9.1-.4.2-.8.2-1.3s-.1-1.1-.3-1.7c-.2-.7-.5-1.4-.7-2.1.2,0,.4-.1.5-.3.2-.2.2-.5.1-.8,0,0-.2-.3-.3-.3,0,0,.1,0,.2,0,0-.3-.1-.6-.2-.9,0,0,0-.2-.1-.3,0,0-.2.2-.3.3h-.3c-.1-.3-.1-.6,0-.9,0-.2,0-.3.2-.4h0ZM19.2,13.3h.8c.1,0,.2,0,.3.1.3.2.6.5.8.8.3.5.4,1,.3,1.6,0,.4-.2.8-.5,1.1-.4.5-1.1.8-1.7.8s-1.5-.4-1.9-1.1c-.3-.6-.4-1.3-.2-1.9.1-.3.4-.6.6-.8.4-.4,1-.6,1.6-.6h0ZM18.9,14.1c-.5,0-1,.5-1.1,1-.1.3,0,.7.1,1,.2.4.6.7,1,.7.6.1,1.2-.1,1.5-.7.2-.4.3-.9,0-1.3-.1-.3-.3-.5-.6-.6-.3-.2-.7-.2-1-.2h.1ZM19.1,14.8c.4,0,.8.2.8.6s-.3.7-.6.7-.5-.1-.7-.3c-.1-.2-.1-.5,0-.6,0-.2.3-.3.5-.4h0ZM2.8,15.1h.9v.7c0,.3.3.6.6.8.3.3.8.3,1.2.2.5-.2,1-.6,1-1.2v-.5h.9c0,.4,0,.8,0,1.2-.2.5-.6.9-1,1.1-.9.5-2,.3-2.7-.4-.5-.5-.8-1.3-.6-2h-.2ZM4.5,15.1h1.1c0,.2,0,.4,0,.6,0,.2-.2.4-.4.4s-.5,0-.7-.2-.3-.6,0-.8h0Z\"/> </svg>",
    "document": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 12.9 16.1\"> <defs> <style> .st0 { fill-rule: evenodd; } </style> </defs> <path class=\"st0\" d=\"M.8,0h11.3c.4,0,.8.4.8.8v14.5c0,.4-.4.8-.8.8H.8c-.4,0-.8-.4-.8-.8V.8c0-.4.4-.8.8-.8h0ZM1.4,1.5h10c.2,0,.4.2.4.4v2.9c0,.2-.2.4-.4.4H1.4c-.2,0-.4-.2-.4-.4V1.9c0-.2.2-.4.4-.4h0ZM9.9,9.5h1.7c.1,0,.2,0,.2.2v4.7s0,.2-.2.2h-1.7c-.1,0-.2,0-.2-.2v-4.7c0-.1,0-.2.2-.2h0ZM9.9,6.5h1.7c.1,0,.2,0,.2.2v1.7c0,.1,0,.2-.2.2h-1.7c-.1,0-.2,0-.2-.2v-1.7c0,0,0-.2.2-.2h0ZM7,12.5h1.7s.2,0,.2.2v1.7c0,.1,0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7c0-.1,0-.2.2-.2h0ZM7,9.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0ZM7,6.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0ZM4.1,12.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0ZM4.1,9.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0ZM4.1,6.5h1.7s.2,0,.2.2v1.7c0,.1,0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7c0,0,0-.2.2-.2h0ZM1.2,12.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0ZM1.2,9.5h1.7s.2,0,.2.2v1.7c0,.1,0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7c0-.1,0-.2.2-.2h0ZM1.2,6.5h1.7s.2,0,.2.2v1.7s0,.2-.2.2h-1.7s-.2,0-.2-.2v-1.7s0-.2.2-.2h0Z\"/> </svg>",
    "gift": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 15.2 16\"> <defs> <style> .st0 { fill-rule: evenodd; } </style> </defs> <path class=\"st0\" d=\"M1.1,8.8h6v7.2H1.3c-.1,0-.3-.1-.3-.3v-6.9h.1ZM8.1,8.8h5.5v6.9c0,.1-.1.3-.3.3h-5.2v-7.2h0Z\"/> <path class=\"st0\" d=\"M.3,5.5h6.8v2.9H.3c0,0-.3-.1-.3-.3v-2.4c0,0,.1-.3.3-.3H.3ZM8.1,5.5h6.8c.1,0,.3,0,.3.3v2.4c0,.1-.1.3-.3.3h-6.8v-2.9h0Z\"/> <path d=\"M6.9,4.6c-2.4-.6-3.5-1.5-3.8-2.3-.4-.8,0-1.6.7-2,.7-.4,1.6-.4,2.4,0,.8.6,1.3,1.8,1,3.9v.3h-.3ZM3.5,2.1c.3.6,1.2,1.4,3.2,1.9.2-1.7-.3-2.7-.9-3.2-.6-.4-1.3-.4-1.8-.1-.5.3-.8.8-.5,1.4h0Z\"/> <path d=\"M8.5,4.1c2-.6,2.9-1.3,3.2-1.9.3-.6,0-1.1-.5-1.4-.5-.3-1.3-.3-1.8.1-.6.5-1,1.4-.9,3.2h0ZM12.2,2.3c-.4.8-1.5,1.6-3.8,2.3h-.3v-.2c-.3-2.1.3-3.3,1-3.9.7-.6,1.7-.5,2.4,0,.7.4,1.1,1.1.7,2h0Z\"/> <path class=\"st0\" d=\"M7,5c-1.8-.3-3.2-.8-4.3-1.4.3.5.4.8.4.8-.5.3-.8.4-.8.4,1.9.3,3.4.4,4.7.2h0Z\"/> <path class=\"st0\" d=\"M8.2,5c1.8-.3,3.2-.8,4.3-1.4-.3.5-.4.8-.4.8.5.3.8.4.8.4-1.9.3-3.4.4-4.7.2h0Z\"/> </svg>",
    "home": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 17.8 16.9\"> <polygon points=\"15.8 0 13.6 0 13.6 3.8 15.8 5.9 15.8 0\"/> <path d=\"M2.2,16.9h.7c-.2-.1-.5-.2-.7-.4v.4Z\"/> <path d=\"M5.1,6.7c2.8,0,5.1,2.4,5.1,5.3s-1.4,4.1-3.3,4.9h9v-7.5l-6.8-6.3-3.9,3.7h0Z\"/> <path d=\"M15.9,6.5h0l-2.6-2.5h0L9,0,0,8.3l.5.6c.9-1.2,2.3-2,3.9-2.2l4.4-4.1h.3l7,6.5.5.5,1.2-1.3-2-1.9h0Z\"/> <path d=\"M4.9,7.1h-.3c-2.5.2-4.6,2.3-4.6,4.9s2.2,4.9,4.9,4.9,4.9-2.2,4.9-4.9-2.2-4.9-4.9-4.9ZM6.9,10.2h-.2s-.2,0-.4-.1h-.5c-.4,0-.7,0-1,.2s-.5.4-.6.7h1.9v.8h-2.1v.4h2.1v.8h-1.9c0,.3.3.5.6.7.3.2.6.2,1,.2h.5c.2,0,.3,0,.4-.1h.2v1.3c-.5.1-1,.2-1.4.2s-.8,0-1.2-.2c-.4-.1-.8-.4-1.1-.7s-.6-.7-.7-1.3h-.9v-.8h.8v-.4h-.8v-.8h.9c.2-.8.6-1.3,1.2-1.6s1.2-.5,1.9-.5,1,0,1.4.2v1.3-.3Z\"/> </svg>",
    "insurance": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 16.4 16.4\"> <path d=\"M9.4,12.8V3.8c0-.7-.3-1-1-1h-2.1v1h0c.5,0,.6,0,.6.7v8.3h2.4ZM10.5,12.8h2.4v-7.1c0-.7-.3-1-1-1h-1.4v8h0ZM6,12.8V4.8h-1.4c-.7,0-1,.3-1,1v7.1h2.4ZM15,8.2c0,4-2.9,6.9-6.8,6.9S1.4,12.2,1.4,8.2,4.3,1.3,8.2,1.3s6.8,2.9,6.8,6.9M16.4,8.2C16.4,3.5,12.9,0,8.2,0S0,3.5,0,8.2s3.5,8.2,8.2,8.2,8.2-3.5,8.2-8.2\"/> </svg>",
    "light": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 13.9 21.2\"> <path d=\"M3.9,18.1h6.2c.4,0,.7-.3.7-.7h0c0-.4-.3-.7-.7-.7H3.9c-.4,0-.7.3-.7.7h0c0,.4.3.7.7.7Z\"/> <path d=\"M4.4,20h.7c.2.7.8,1.2,1.5,1.2h.6c.7,0,1.4-.5,1.5-1.2h.7c.4,0,.7-.3.7-.7h0c0-.4-.3-.7-.7-.7h-5.1c-.4,0-.7.3-.7.7h0c0,.4.3.7.7.7h.1Z\"/> <g> <path d=\"M5.6,6.8c-.3,0-.5.4-.4.6,0,.9,1.3,1.3,1.3,1.3v-1.2c-.3-.6-.6-.7-.9-.7Z\"/> <path d=\"M7,0C3.4,0,.3,2.8,0,6.4c-.2,2.4.8,4.7,2.6,6.1.3.3.5.7.5,1.1v2.5h3.2v-6.5c-4-.7-1.9-5.8.6-3.1,2.5-2.7,4.5,2.4.6,3.1v6.5h3.2v-2.5c0-.4.2-.8.5-1.1,1.7-1.3,2.7-3.3,2.7-5.5.1-3.8-3-7-6.9-7Z\"/> <path d=\"M8.8,7.4c0-.3-.1-.6-.4-.6s-.6,0-.9.7v1.2s1.2-.4,1.3-1.3Z\"/> </g> </svg>",
    "phone": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 11 17.8\"> <path d=\"M2,0h6.9c.3,0,.5,0,.8.2.2.1.5.2.7.4.2.2.3.4.4.7.1.2.2.5.2.8v13.6c0,.3,0,.5-.2.8-.1.2-.2.5-.4.7s-.4.3-.7.4c-.2.1-.5.2-.8.2H2c-.5,0-1-.2-1.4-.6-.4-.4-.6-.9-.6-1.4V2c0-.5.2-1,.6-1.4.4-.4.9-.6,1.4-.6h0ZM7,1.5v-.2h-2.8v.2h0v.2h2.8v-.2h0ZM9.6,3H1.3v11.2h8.3V3ZM6.2,15.9c0-.2,0-.4-.2-.5,0-.1-.3-.2-.5-.2s-.4,0-.5.2c0,.1-.2.3-.2.5s0,.4.2.5c0,.1.3.2.5.2s.4,0,.5-.2c0-.1.2-.3.2-.5h0Z\"/> </svg>",
    "school": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 18.6 13.8\"> <defs> <style> .st0 { fill: #161616; } </style> </defs> <path class=\"st0\" d=\"M9.3,8.6h-.2l-6.1-2.4v3.4c0,.6.3,1.1.8,1.5,1.8,1.1,3.6,1.7,5.5,1.7s3.7-.6,5.5-1.7c.5-.3.8-.9.8-1.5v-3.4l-6.1,2.4h-.2Z\"/> <path class=\"st0\" d=\"M17.8,4.7l.6-.2s.2,0,.2-.2v-.3c0-.2-.1-.4-.3-.5L9.5,0h-.4L.3,3.6c-.2,0-.3.3-.3.5v.3l.2.2,2.8,1.1,6.1,2.4h.4l6.1-2.4,1.4-.6v5.1c-.4.2-.8.6-.8,1.1v2.1c0,.2.2.4.4.4h1.5c.2,0,.4-.2.4-.4v-2.1c0-.3-.1-.6-.4-.8-.1-.1-.3-.2-.4-.3v-5.4h0Z\"/> </svg>",
    "shirt": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 18.6 15.4\"> <path d=\"M5.6.2c.3,0,.7-.3,1-.1s.3.5.4.8c.5,1,1.8,1.5,2.9,1.3.8-.2,1.5-.8,1.8-1.6,0-.2.1-.4.3-.5.3-.1.6,0,1,0,.9.2,1.8.4,2.5,1,.8.7,1.6,1.5,2.4,2.2.3.3.6.5.7.9,0,.3,0,.7-.2,1-.5.6-1,1.2-1.5,1.8-.3.4-1,.6-1.4.3-.3-.2-.5-.4-.8-.6v7.4c0,.7-.6,1.2-1.3,1.2H5.3c-.7,0-1.3-.6-1.3-1.3v-7.3c-.3.2-.5.4-.8.6-.4.3-1.1.2-1.4-.2-.5-.6-1.1-1.3-1.6-1.9-.2-.3-.3-.6-.2-.9,0-.3.4-.6.6-.8.6-.5,1.2-1.1,1.8-1.6.4-.4.8-.8,1.2-1,.6-.4,1.4-.5,2-.7h0Z\"/> </svg>",
    "water": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 13.5 22.1\"> <path d=\"M12.9,11.4h0c0-.2-.2-.4-.3-.6-.1-.2-.2-.4-.3-.6L6.8,0,1.3,10.2c-.1.2-.2.4-.3.6-.1.2-.2.4-.3.6h0c-.4,1-.7,2.1-.7,3.3,0,4.1,3.1,7.4,6.8,7.4s6.7-3.3,6.7-7.4-.3-2.3-.7-3.3h0ZM11.8,17.5c-.4.9-1.1,2.1-2.8,2.6h-.1c-.2,0-.4-.1-.4-.4s0-.5.3-.6c1-.3,1.8-1,2.2-2,.3-.8.3-1.5.3-1.5,0-.3.2-.5.5-.5s.5.2.5.5,0,.9-.4,1.9h-.1Z\"/> </svg>",
    "work": "<svg class=\"cf-icon-v2 flat custom-category-icon-v2\" id=\"Layer_1\" version=\"1.1\" viewBox=\"0 0 20.5 16.3\"> <path d=\"M12.5,8.4h-4.4c-.1,0-.2,0-.2.2v2c0,.1,0,.2.2.2h4.4c.1,0,.2,0,.2-.2v-2c0-.1,0-.2-.2-.2ZM13.3,10.6c0,.5-.4.8-.8.8h-4.4c-.5,0-.8-.4-.8-.8v-.7H0v4.6c0,1,.8,1.8,1.8,1.8h16.9c1,0,1.8-.8,1.8-1.8v-4.6h-7.2s0,.7,0,.7ZM18.7,2.9h-4.9v-.6c0-.3,0-.6-.2-.9-.1-.3-.3-.5-.5-.7s-.5-.4-.7-.5c-.3-.1-.6-.2-.9-.2h-2.4c-.3,0-.6,0-.9.2-.3,0-.5.3-.7.5s-.4.5-.5.7c0,.3-.2.6-.2.9v.6H1.8c-1,0-1.8.8-1.8,1.8v4.6h7.2v-.7c0-.5.4-.8.8-.8h4.4c.5,0,.8.4.8.8v.7h7.2v-4.6c0-1-.8-1.8-1.8-1.8h.1ZM12.8,2.9h-5v-.6c0-.7.6-1.3,1.3-1.3h2.4c.7,0,1.3.6,1.3,1.3v.6Z\"/> </svg>"
  };
  return shapes[type] || shapes.document;
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
    const note = $("expenseNoteV2").value.trim();

    const result = await api({
      action: "addExpense",
      user: activeUser,
      month: activeMonth,
      category,
      amount,
      note
    });

    selectedCategory = category;
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);

    $("amountInputV2").value = "";
    $("expenseNoteV2").value = "";
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
        ${transaction.note ? `<span class="history-note-v2">${escapeHtml(transaction.note)}</span>` : ""}
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

  $("expenseNoteV2").addEventListener("keydown", event => {
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


/* =========================================================
   Phase 14 — Category Management
   ========================================================= */
const CATEGORY_ICON_LIBRARY_V14 = [
  ["cart","SM / Supermarket"],["delivery","Delivery"],["work","Work"],
  ["shirt","Clothes"],["car","Car"],["beauty","Hair / Beauty"],
  ["phone","Phone"],["art","Adobe / Creative"],["light","Electricity"],
  ["water","Water"],["home","Home / Loan"],["gift","Gifts"],
  ["school","School"],["insurance","Insurance"],["document","Document / Other"]
];

function categoryLibraryV14(){
  return Array.isArray(appData?.categoryLibrary) ? appData.categoryLibrary : [];
}
function categoryMetaV14(name){
  const n=normalizeName(name);
  return categoryLibraryV14().find(x=>normalizeName(x.name)===n) || null;
}
function categoryIdV14(name){ return categoryMetaV14(name)?.id || normalizeName(name); }
function categoryNameFromIdV14(id){
  return categoryLibraryV14().find(x=>String(x.id)===String(id))?.name || "";
}

const categoryIconLegacyV14 = categoryIcon;
categoryIcon = function(name){
  const meta=categoryMetaV14(name);
  return meta?.icon ? iconSvgV2(meta.icon) : categoryIconLegacyV14(name);
};

function loadQuickCategoryNames(categoryNames){
  try{
    const ids=JSON.parse(localStorage.getItem(QUICK_IDS_STORAGE_KEY)||"[]");
    if(Array.isArray(ids) && ids.length){
      const names=ids.map(categoryNameFromIdV14).filter(Boolean);
      if(names.length) return names.slice(0,MAX_QUICK_CATEGORIES);
    }
    const old=JSON.parse(localStorage.getItem(QUICK_STORAGE_KEY)||"[]");
    if(Array.isArray(old)){
      const byNormalized=new Map(categoryNames.map(n=>[normalizeName(n),n]));
      const valid=old.map(n=>byNormalized.get(normalizeName(n))).filter(Boolean);
      if(valid.length) return [...new Set(valid)].slice(0,MAX_QUICK_CATEGORIES);
    }
  }catch(e){ console.warn(e); }
  return getDefaultQuickCategories(categoryNames);
}
function saveQuickCategoryNames(){
  localStorage.setItem(QUICK_STORAGE_KEY,JSON.stringify(quickCategoryNames));
  localStorage.setItem(QUICK_IDS_STORAGE_KEY,JSON.stringify(quickCategoryNames.map(categoryIdV14)));
}

function populateCategoryIconSelectV14(select, selected){
  select.innerHTML="";
  CATEGORY_ICON_LIBRARY_V14.forEach(([id,label])=>{
    const o=document.createElement("option"); o.value=id; o.textContent=label; o.selected=id===selected; select.appendChild(o);
  });
}

function renderManageCategoriesV14(){
  const list=$("manageCategoryListV2");
  if(!list) return;
  const library=categoryLibraryV14().slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
  list.innerHTML="";
  library.forEach((item,index)=>{
    const row=document.createElement("div"); row.className="manage-category-row-v2"; row.dataset.id=item.id;
    row.innerHTML=`
      <span class="manage-category-swatch-v2" style="--cat-color:${escapeHtml(item.color||"#6f8f7a")}">${iconSvgV2(item.icon||"document")}</span>
      <span class="manage-category-main-v2"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.icon||"document")}</small></span>
      <span class="manage-category-actions-v2">
        <button type="button" data-action="up" title="Move up" ${index===0?"disabled":""}>↑</button>
        <button type="button" data-action="down" title="Move down" ${index===library.length-1?"disabled":""}>↓</button>
        <button type="button" data-action="edit" title="Edit">✎</button>
        <button type="button" data-action="delete" class="danger" title="Delete">×</button>
      </span>`;
    row.addEventListener("click",async e=>{
      const action=e.target.closest("button")?.dataset.action; if(!action) return;
      if(action==="edit") return openCategoryEditorV14(row,item);
      if(action==="delete") return deleteCategoryV14(item);
      if(action==="up"||action==="down") return moveCategoryV14(item.id,action);
    });
    list.appendChild(row);
  });
}

function openCategoryEditorV14(row,item){
  if(row.querySelector('.category-edit-grid-v2')) return;
  const editor=document.createElement('div'); editor.className='category-edit-grid-v2';
  editor.innerHTML=`<input class="wide" data-field="name" maxlength="40" value="${escapeHtml(item.name)}"><select data-field="icon"></select><input data-field="color" type="color" value="${escapeHtml(item.color||'#6f8f7a')}"><button class="cancel" type="button">Cancel</button><button class="save" type="button">Save</button>`;
  populateCategoryIconSelectV14(editor.querySelector('select'),item.icon||'document');
  editor.querySelector('.cancel').onclick=()=>editor.remove();
  editor.querySelector('.save').onclick=async()=>{
    const name=editor.querySelector('[data-field=name]').value.trim();
    if(!name) return showMessage('Category name is required.','error');
    try{
      await api({action:'updateCategory',id:item.id,name,icon:editor.querySelector('[data-field=icon]').value,color:editor.querySelector('[data-field=color]').value});
      if(selectedCategory===item.name){selectedCategory=name;localStorage.setItem(LAST_CATEGORY_KEY,name)}
      await loadData(); showMessage('Category updated.','success',1600);
    }catch(err){showMessage(err.message,'error',3500)}
  };
  row.appendChild(editor);
}

async function addCategoryV14(){
  const name=$("categoryNameInputV2").value.trim();
  const budget=Math.max(Number($("categoryBudgetInputV2").value)||0,0);
  if(!name) return showMessage('Enter a category name.','error');
  const btn=$("addCategoryBtnV2"); btn.disabled=true; btn.textContent='Adding...';
  try{
    const result=await api({action:'createCategory',month:activeMonth,name,budget,icon:$("categoryIconSelectV2").value,color:$("categoryColorInputV2").value});
    $("categoryNameInputV2").value=''; $("categoryBudgetInputV2").value='';
    selectedCategory=result.category?.name||name; localStorage.setItem(LAST_CATEGORY_KEY,selectedCategory);
    await loadData(); showMessage('Category created.','success',1800);
  }catch(err){showMessage(err.message,'error',3500)}finally{btn.disabled=false;btn.textContent='Add Category'}
}
async function deleteCategoryV14(item){
  const typed=prompt(`Delete “${item.name}”?\n\nOld History entries will remain. Type DELETE to confirm.`,'');
  if(typed!== 'DELETE') return;
  try{
    await api({action:'deleteCategory',id:item.id});
    quickCategoryNames=quickCategoryNames.filter(n=>categoryIdV14(n)!==item.id); saveQuickCategoryNames();
    if(normalizeName(selectedCategory)===normalizeName(item.name)) selectedCategory='';
    await loadData(); showMessage('Category removed.','success',1800);
  }catch(err){showMessage(err.message,'error',3500)}
}
async function moveCategoryV14(id,direction){
  try{await api({action:'reorderCategory',id,direction});await loadData()}catch(err){showMessage(err.message,'error',3500)}
}

const openSettingsBeforeV14=openSettings;
openSettings=function(){openSettingsBeforeV14();renderManageCategoriesV14();populateCategoryIconSelectV14($("categoryIconSelectV2"),"document")};

const loadDataBeforeV14=loadData;
loadData=async function(){await loadDataBeforeV14();renderManageCategoriesV14();const s=$("categoryIconSelectV2");if(s&&!s.options.length)populateCategoryIconSelectV14(s,"document")};

document.addEventListener('DOMContentLoaded',()=>{
  const add=$("addCategoryBtnV2"); if(add) add.addEventListener('click',addCategoryV14);
  const sel=$("categoryIconSelectV2"); if(sel) populateCategoryIconSelectV14(sel,'document');
});
