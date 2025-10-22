const RSS_URL = "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=50&category=14336";

// Multiple CORS proxies to try as fallbacks
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.codetabs.com/v1/proxy?quest="
];

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

// Fetch MARADMINs from RSS (via proxy with fallbacks)
async function fetchMaradmins() {
  statusDiv.textContent = "Fetching MARADMINs...";
  errorDiv.classList.add("hidden");

  // Try direct fetch first (might work if CORS is allowed)
  try {
    const text = await tryDirectFetch();
    if (text) {
      processRSSData(text);
      return;
    }
  } catch(err) {
    console.log("Direct fetch failed, trying proxies...", err);
  }

  // Try each CORS proxy
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      statusDiv.textContent = `Fetching MARADMINs... (attempt ${i + 1}/${CORS_PROXIES.length})`;
      const text = await tryProxyFetch(CORS_PROXIES[i]);
      if (text) {
        processRSSData(text);
        return;
      }
    } catch(err) {
      console.log(`Proxy ${i + 1} failed:`, err.message);
      if (i === CORS_PROXIES.length - 1) {
        // Last proxy failed
        if (allMaradmins.length === 0) {
          loadCachedData();
        }

        if (allMaradmins.length > 0) {
          showError(`Unable to fetch new MARADMINs. Network issue or proxy unavailable. <br>Showing cached data from ${lastUpdateSpan.textContent}.`);
        } else {
          showError(`Unable to fetch MARADMINs. Please check your internet connection and try again. <br><small>All CORS proxies failed. The RSS feed may be temporarily unavailable.</small>`);
          statusDiv.textContent = "No data available";
        }
      }
    }
  }
}

// Try direct fetch without proxy
async function tryDirectFetch() {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), 10000)
  );

  const fetchPromise = fetch(RSS_URL, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache'
  });

  const response = await Promise.race([fetchPromise, timeoutPromise]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

// Try fetch with a specific CORS proxy with timeout
async function tryProxyFetch(proxy) {
  const url = proxy.includes('allorigins')
    ? proxy + encodeURIComponent(RSS_URL)
    : proxy + RSS_URL;

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), 15000)
  );

  // Create fetch promise
  const fetchPromise = fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/xml, text/xml, */*'
    }
  });

  // Race between fetch and timeout
  const response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();

  // Handle allorigins.win response format (returns JSON with 'contents' field)
  if (proxy.includes('allorigins') && !proxy.includes('/raw')) {
    try {
      const json = JSON.parse(text);
      return json.contents || text;
    } catch(e) {
      return text;
    }
  }

  return text;
}

// Process the RSS data once fetched
function processRSSData(text) {
  allMaradmins = parseRSS(text);
  allMaradmins.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));
  filterMaradmins(); // Apply current filters
  cacheData(allMaradmins);
  statusDiv.textContent = `Loaded ${allMaradmins.length} total MARADMINs.`;
  updateLastUpdate();
}

// Fetch full message details from the message page
async function fetchMessageDetails(message) {
  if (message.detailsFetched) return message;

  try {
    // Try multiple CORS proxies to fetch the page
    let html = null;
    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy.includes('allorigins')
          ? proxy + encodeURIComponent(message.link)
          : proxy + message.link;

        const response = await fetch(url, { timeout: 10000 });
        if (response.ok) {
          html = await response.text();

          // Handle allorigins response
          if (proxy.includes('allorigins') && !proxy.includes('/raw')) {
            try {
              const json = JSON.parse(html);
              html = json.contents || html;
            } catch(e) {}
          }
          break;
        }
      } catch(e) {
        console.log(`Failed to fetch via ${proxy}:`, e.message);
      }
    }

    if (!html) throw new Error('All proxies failed');

    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract MARADMIN number from content
    const bodyText = doc.body?.textContent || '';
    const maradminMatch = bodyText.match(/MARADMIN\s+(?:NUMBER\s+)?(\d+[-\/]\d+)/i);

    if (maradminMatch) {
      message.maradminNumber = maradminMatch[1];
      message.id = `MARADMIN ${maradminMatch[1]}`;
    }

    // Extract 5 Ws from the message content
    message.fiveWs = extract5Ws(bodyText, message.title);
    message.detailsFetched = true;

    // Update cache
    cacheData(allMaradmins);

    console.log(`Fetched details for ${message.id}:`, message.fiveWs);
    return message;

  } catch(error) {
    console.error(`Error fetching details for ${message.id}:`, error);
    message.detailsFetched = true; // Mark as attempted
    return message;
  }
}

// Extract 5 Ws (Who, What, When, Where, Why) from message content
function extract5Ws(content, title) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const fiveWs = {
    who: '',
    what: '',
    when: '',
    where: '',
    why: ''
  };

  // What: Use the title/subject as the primary "what"
  fiveWs.what = title;

  // Who: Look for organizational references
  const whoPatterns = [
    /(?:to|for|from)[:.\s]+([A-Z][A-Z\s,]+(?:MARINE|CORPS|USMC|COMMAND|FORCE|DIVISION|REGIMENT|BATTALION|SQUADRON)[A-Z\s,]*)/i,
    /(?:all|active|reserve|selected)\s+(marines|personnel|officers|enlisted)/i
  ];

  for (const pattern of whoPatterns) {
    const match = content.match(pattern);
    if (match) {
      fiveWs.who = match[1] || match[0];
      break;
    }
  }

  // When: Look for effective dates, deadlines
  const whenPatterns = [
    /effective(?:\s+date)?[:.\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:by|on|before|until)[:.\s]+(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i,
    /deadline[:.\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /fiscal\s+year\s+(\d{2,4})/i
  ];

  for (const pattern of whenPatterns) {
    const match = content.match(pattern);
    if (match) {
      fiveWs.when = match[1] || match[0];
      break;
    }
  }

  // Where: Look for location references
  const wherePatterns = [
    /(?:location|at|base|station|installation)[:.\s]+([A-Z][A-Za-z\s,]+(?:CA|NC|VA|HI|SC|AZ|TX|FL|DC|OKINAWA|JAPAN))/i,
    /(?:MARINE CORPS BASE|MCB|CAMP)\s+([A-Z][A-Za-z\s]+)/i
  ];

  for (const pattern of wherePatterns) {
    const match = content.match(pattern);
    if (match) {
      fiveWs.where = match[1] || match[0];
      break;
    }
  }

  // Why: Look for purpose statements
  const whyPatterns = [
    /(?:purpose|intent|in order to|to provide|to establish|to update|to announce)[:.\s]+([^.]+\.)/i,
    /(?:this message)\s+(?:provides|establishes|announces|updates)\s+([^.]+\.)/i
  ];

  for (const pattern of whyPatterns) {
    const match = content.match(pattern);
    if (match) {
      fiveWs.why = match[1] || match[0];
      break;
    }
  }

  // Clean up extracted text
  Object.keys(fiveWs).forEach(key => {
    if (fiveWs[key]) {
      fiveWs[key] = fiveWs[key]
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .substring(0, 200); // Limit length
    } else {
      fiveWs[key] = 'Not specified';
    }
  });

  return fiveWs;
}

// Parse RSS XML - Enhanced to extract more metadata
function parseRSS(xmlText){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText,"application/xml");
  const items = Array.from(xml.querySelectorAll("item"));

  console.log(`Total RSS items found: ${items.length}`);

  const parsed = items.map((item, index) => {
    const title = item.querySelector("title")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const description = item.querySelector("description")?.textContent || "";
    const category = item.querySelector("category")?.textContent || "";

    // Extract MARADMIN ID from multiple sources
    // 1. Try title first
    let idMatch = title.match(/MARADMIN\s+(\d+[-\/]\d+)/i);

    // 2. Try description if not in title
    if (!idMatch && description) {
      idMatch = description.match(/MARADMIN\s+(\d+[-\/]\d+)/i);
    }

    let id, numericId, subject;

    if (idMatch) {
      // Has MARADMIN ID
      id = idMatch[0];
      numericId = idMatch[1];
      subject = title.replace(/MARADMIN\s+\d+[-\/]?\d*\s*[-:]?\s*/i, "").trim();
    } else {
      // No MARADMIN ID found - use Article ID from link
      const linkMatch = link.match(/\/Article\/(\d+)\//);
      id = linkMatch ? `Article ${linkMatch[1]}` : `Message ${index + 1}`;
      numericId = linkMatch ? linkMatch[1] : String(index + 1);
      subject = title;
    }

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
      searchText: `${id} ${subject} ${cleanDescription}`.toLowerCase(),
      detailsFetched: false, // Track if we've fetched full details
      maradminNumber: null, // Will be filled when fetching details
      fiveWs: null // Will be filled when fetching details
    };
  });

  console.log(`Parsed ${parsed.length} messages from ${items.length} RSS items`);
  return parsed;
}

// Filter and Search Functions
function filterMaradmins() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const dateRange = parseInt(dateRangeSelect.value);

  let filtered = [...allMaradmins];
  console.log(`Starting filter with ${filtered.length} total MARADMINs`);

  // Apply date filter
  if (dateRange > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    console.log(`Filtering by date: last ${dateRange} days (since ${cutoffDate.toLocaleDateString()})`);
    filtered = filtered.filter(m => m.pubDateObj >= cutoffDate);
    console.log(`After date filter: ${filtered.length} MARADMINs`);
  }

  // Apply search filter
  if (searchTerm) {
    console.log(`Filtering by search term: "${searchTerm}"`);
    filtered = filtered.filter(m => m.searchText.includes(searchTerm));
    console.log(`After search filter: ${filtered.length} MARADMINs`);
  }

  currentMaradmins = filtered;
  renderMaradmins(currentMaradmins);
  updateResultsCount();
}

function clearSearch() {
  searchInput.value = "";
  dateRangeSelect.value = "30"; // Reset to 30 days default
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

  arr.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "maradmin";
    div.dataset.index = index;

    // Enhanced display with more metadata
    div.innerHTML = `
      <div class="maradmin-header">
        <h2><span class="maradmin-id">${item.id}</span></h2>
        <span class="maradmin-date">${formatDate(item.pubDateObj)}</span>
      </div>
      <h3 class="maradmin-subject"><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.subject}</a></h3>
      <p class="maradmin-summary">${item.summary}</p>
      <div class="maradmin-details" id="details-${index}" style="display:none;">
        <div class="loading-details">Loading details...</div>
      </div>
      <div class="maradmin-footer">
        ${item.category ? `<span class="category">${item.category}</span>` : ''}
        <button class="expand-btn" onclick="toggleDetails(${index}, currentMaradmins[${index}])">
          ${item.detailsFetched && item.fiveWs ? '📋 Hide Details' : '📋 Show 5 Ws'}
        </button>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="view-full">View Full Message →</a>
      </div>
    `;
    resultsDiv.appendChild(div);
  });
}

// Toggle message details (5 Ws)
async function toggleDetails(index, message) {
  const detailsDiv = document.getElementById(`details-${index}`);
  const btn = event.target;

  // If already visible, hide it
  if (detailsDiv.style.display === 'block') {
    detailsDiv.style.display = 'none';
    btn.textContent = '📋 Show 5 Ws';
    return;
  }

  // Show the details div
  detailsDiv.style.display = 'block';

  // If not fetched yet, fetch now
  if (!message.detailsFetched) {
    detailsDiv.innerHTML = '<div class="loading-details">Fetching message details...</div>';
    btn.disabled = true;

    try {
      await fetchMessageDetails(message);

      // Update button text
      btn.textContent = '📋 Hide Details';
      btn.disabled = false;

      // Display the 5 Ws
      if (message.fiveWs) {
        detailsDiv.innerHTML = `
          <div class="five-ws">
            <h4>5 Ws Summary</h4>
            <div class="ws-grid">
              <div class="w-item">
                <strong>Who:</strong>
                <span>${message.fiveWs.who}</span>
              </div>
              <div class="w-item">
                <strong>What:</strong>
                <span>${message.fiveWs.what}</span>
              </div>
              <div class="w-item">
                <strong>When:</strong>
                <span>${message.fiveWs.when}</span>
              </div>
              <div class="w-item">
                <strong>Where:</strong>
                <span>${message.fiveWs.where}</span>
              </div>
              <div class="w-item">
                <strong>Why:</strong>
                <span>${message.fiveWs.why}</span>
              </div>
            </div>
            ${message.maradminNumber ? `<p class="maradmin-number-found">📄 MARADMIN Number: <strong>${message.maradminNumber}</strong></p>` : ''}
          </div>
        `;
      } else {
        detailsDiv.innerHTML = '<div class="error-details">Could not extract details from this message.</div>';
      }

      // Update the ID in the header if we found the MARADMIN number
      if (message.maradminNumber && message.id.startsWith('Article')) {
        const headerIdSpan = detailsDiv.closest('.maradmin').querySelector('.maradmin-id');
        if (headerIdSpan) {
          headerIdSpan.textContent = `MARADMIN ${message.maradminNumber}`;
        }
      }

    } catch (error) {
      detailsDiv.innerHTML = '<div class="error-details">Failed to fetch message details. Please try again.</div>';
      btn.disabled = false;
      btn.textContent = '📋 Retry';
    }
  } else {
    // Already fetched, just display
    btn.textContent = '📋 Hide Details';

    if (message.fiveWs) {
      detailsDiv.innerHTML = `
        <div class="five-ws">
          <h4>5 Ws Summary</h4>
          <div class="ws-grid">
            <div class="w-item">
              <strong>Who:</strong>
              <span>${message.fiveWs.who}</span>
            </div>
            <div class="w-item">
              <strong>What:</strong>
              <span>${message.fiveWs.what}</span>
            </div>
            <div class="w-item">
              <strong>When:</strong>
              <span>${message.fiveWs.when}</span>
            </div>
            <div class="w-item">
              <strong>Where:</strong>
              <span>${message.fiveWs.where}</span>
            </div>
            <div class="w-item">
              <strong>Why:</strong>
              <span>${message.fiveWs.why}</span>
            </div>
          </div>
          ${message.maradminNumber ? `<p class="maradmin-number-found">📄 MARADMIN Number: <strong>${message.maradminNumber}</strong></p>` : ''}
        </div>
      `;
    }
  }
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function showError(msg) {
  errorDiv.innerHTML = msg;
  errorDiv.classList.remove("hidden");

  // Auto-hide after showing cached data successfully
  if (allMaradmins.length > 0) {
    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, 5000);
  }
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
