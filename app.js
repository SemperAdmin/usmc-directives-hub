const RSS_URL = "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=50&category=14336";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const themeToggle = document.getElementById("themeToggle");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");
const resultsDiv = document.getElementById("results");
const lastUpdateSpan = document.getElementById("lastUpdate");
const searchInput = document.getElementById("searchInput");
const dateRangeSelect = document.getElementById("dateRange");
const clearSearchBtn = document.getElementById("clearSearch");

let currentMaradmins = [];
let allMaradmins = []; // Store all fetched messages for filtering

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadCachedData();
  fetchMaradmins();
  initTheme();
});
refreshBtn.addEventListener("click", fetchMaradmins);
exportBtn.addEventListener("click", exportToJSON);
themeToggle.addEventListener("click", toggleTheme);
searchInput.addEventListener("input", filterMaradmins);
dateRangeSelect.addEventListener("change", filterMaradmins);
clearSearchBtn.addEventListener("click", clearSearch);

// Fetch MARADMINs from RSS (via proxy)
async function fetchMaradmins() {
  statusDiv.textContent = "Fetching MARADMINs...";
  errorDiv.classList.add("hidden");
  resultsDiv.innerHTML = "";
  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(RSS_URL));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    allMaradmins = parseRSS(text);
    allMaradmins.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));
    filterMaradmins(); // Apply current filters
    cacheData(allMaradmins);
    statusDiv.textContent = `Loaded ${allMaradmins.length} total MARADMINs.`;
    updateLastUpdate();
  } catch(err) {
    showError(`Fetch failed: ${err.message}. Showing cached data.`);
  }
}

// Parse RSS XML - Enhanced to extract more metadata
function parseRSS(xmlText){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText,"application/xml");
  return Array.from(xml.querySelectorAll("item")).map(item=>{
    const title = item.querySelector("title")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const description = item.querySelector("description")?.textContent || "";
    const category = item.querySelector("category")?.textContent || "";

    // Extract MARADMIN ID (e.g., "MARADMIN 123/24")
    const idMatch = title.match(/MARADMIN\s+(\d+\/\d+)/i);
    if (!idMatch) return null;

    const id = idMatch[0];
    const numericId = idMatch[1];

    // Extract subject from title (text after MARADMIN number)
    const subject = title.replace(/MARADMIN\s+\d+\/\d+\s*[-:]?\s*/i, "").trim();

    // Clean and extract description
    const cleanDescription = description.replace(/<[^>]*>/g, "").trim();
    const summary = firstSentence(cleanDescription);

    return {
      id,
      numericId,
      subject,
      title,
      link,
      pubDate: new Date(pubDate).toISOString(),
      pubDateObj: new Date(pubDate),
      summary,
      description: cleanDescription,
      category,
      searchText: `${id} ${subject} ${cleanDescription}`.toLowerCase()
    };
  }).filter(Boolean);
}

// Filter and Search Functions
function filterMaradmins() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const dateRange = parseInt(dateRangeSelect.value);

  let filtered = [...allMaradmins];

  // Apply date filter
  if (dateRange > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    filtered = filtered.filter(m => m.pubDateObj >= cutoffDate);
  }

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(m => m.searchText.includes(searchTerm));
  }

  currentMaradmins = filtered;
  renderMaradmins(currentMaradmins);
  updateResultsCount();
}

function clearSearch() {
  searchInput.value = "";
  dateRangeSelect.value = "7";
  filterMaradmins();
}

function updateResultsCount() {
  const countText = currentMaradmins.length === allMaradmins.length
    ? `Showing all ${currentMaradmins.length} MARADMINs`
    : `Showing ${currentMaradmins.length} of ${allMaradmins.length} MARADMINs`;
  statusDiv.textContent = countText;
}

// Utilities
function firstSentence(text) {
  if(!text) return "";
  const m = text.replace(/<[^>]*>/g,"").match(/^[^.!?]+[.!?]/);
  return m ? m[0] : text.substring(0,150)+"...";
}

function renderMaradmins(arr) {
  resultsDiv.innerHTML = "";
  if (arr.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No MARADMINs found matching your criteria.</div>';
    return;
  }

  arr.forEach(item => {
    const div = document.createElement("div");
    div.className = "maradmin";

    // Enhanced display with more metadata
    div.innerHTML = `
      <div class="maradmin-header">
        <h2><span class="maradmin-id">${item.id}</span></h2>
        <span class="maradmin-date">${formatDate(item.pubDateObj)}</span>
      </div>
      <h3 class="maradmin-subject"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.subject}</a></h3>
      <p class="maradmin-summary">${item.summary}</p>
      <div class="maradmin-footer">
        ${item.category ? `<span class="category">${item.category}</span>` : ''}
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="view-full">View Full Message →</a>
      </div>
    `;
    resultsDiv.appendChild(div);
  });
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
}

function cacheData(data) {
  try {
    localStorage.setItem("maradmin_cache", JSON.stringify(data));
    localStorage.setItem("maradmin_cache_timestamp", new Date().toISOString());
  } catch(e) {
    console.error("Failed to cache data:", e);
  }
}

function loadCachedData() {
  try {
    const cached = localStorage.getItem("maradmin_cache");
    const ts = localStorage.getItem("maradmin_cache_timestamp");
    if (cached) {
      allMaradmins = JSON.parse(cached);
      // Reconstruct Date objects
      allMaradmins = allMaradmins.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
      filterMaradmins();
      lastUpdateSpan.textContent = new Date(ts).toLocaleString();
    }
  } catch(e) {
    console.error("Failed to load cached data:", e);
  }
}

function exportToJSON() {
  if(!currentMaradmins.length) {
    showError("No data to export.");
    return;
  }
  const exportData = currentMaradmins.map(m => ({
    id: m.id,
    numericId: m.numericId,
    subject: m.subject,
    link: m.link,
    pubDate: m.pubDate,
    category: m.category,
    description: m.description
  }));
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maradmins_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
}

function updateLastUpdate() {
  lastUpdateSpan.textContent = new Date().toLocaleString();
}
