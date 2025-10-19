const RSS_URL = "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=50&category=14336";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const themeToggle = document.getElementById("themeToggle");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");
const resultsDiv = document.getElementById("results");
const lastUpdateSpan = document.getElementById("lastUpdate");

let currentMaradmins = [];

// Init
document.addEventListener("DOMContentLoaded", () => { loadCachedData(); fetchMaradmins(); });
refreshBtn.addEventListener("click", fetchMaradmins);
exportBtn.addEventListener("click", exportToJSON);
themeToggle.addEventListener("click", toggleTheme);

// Fetch MARADMINs from RSS (via proxy)
async function fetchMaradmins() {
  statusDiv.textContent = "Fetching MARADMINs...";
  errorDiv.classList.add("hidden");
  resultsDiv.innerHTML = "";
  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(RSS_URL));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    currentMaradmins = parseRSS(text).filter(item => new Date(item.pubDate) >= sevenDaysAgo());
    currentMaradmins.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));
    renderMaradmins(currentMaradmins);
    cacheData(currentMaradmins);
    statusDiv.textContent = `Loaded ${currentMaradmins.length} MARADMINs.`;
    updateLastUpdate();
  } catch(err) {
    showError(`Fetch failed: ${err.message}`);
  }
}

// Parse RSS XML
function parseRSS(xmlText){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText,"application/xml");
  return Array.from(xml.querySelectorAll("item")).map(item=>{
    const title = item.querySelector("title")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const idMatch = title.match(/MARADMIN\s+\d+\/\d+/i);
    return idMatch ? {id:idMatch[0],title,link,pubDate:new Date(pubDate).toISOString(),summary:firstSentence(item.querySelector("description")?.textContent)} : null;
  }).filter(Boolean);
}

// Utilities
function firstSentence(text){ if(!text) return ""; const m=text.replace(/<[^>]*>/g,"").match(/^[^.!?]+[.!?]/); return m?m[0]:text.substring(0,150)+"..."; }
function sevenDaysAgo(){ const d=new Date(); d.setDate(d.getDate()-7); return d; }
function renderMaradmins(arr){ resultsDiv.innerHTML=""; arr.forEach(i=>{ const div=document.createElement("div"); div.className="maradmin"; div.innerHTML=`<h2>${i.id}: <a href="${i.link}" target="_blank">${i.title}</a></h2><p>Published: ${new Date(i.pubDate).toUTCString()}</p><p class="summary">${i.summary}</p>`; resultsDiv.appendChild(div); }); }
function showError(msg){ errorDiv.textContent=msg; errorDiv.classList.remove("hidden"); }
function cacheData(data){ localStorage.setItem("maradmin_cache",JSON.stringify(data)); localStorage.setItem("maradmin_cache_timestamp",new Date().toISOString()); }
function loadCachedData(){ const cached=localStorage.getItem("maradmin_cache"); const ts=localStorage.getItem("maradmin_cache_timestamp"); if(cached){ currentMaradmins=JSON.parse(cached); renderMaradmins(currentMaradmins); lastUpdateSpan.textContent=new Date(ts).toLocaleString(); } }
function exportToJSON(){ if(!currentMaradmins.length){ showError("No data to export."); return; } const blob=new Blob([JSON.stringify(currentMaradmins,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`maradmins_${new Date().toISOString().split("T")[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function toggleTheme(){ document.body.classList.toggle("dark-theme"); localStorage.setItem("theme",document.body.classList.contains("dark-theme")?"dark":"light"); }
function updateLastUpdate(){ lastUpdateSpan.textContent=new Date().toLocaleString(); }
