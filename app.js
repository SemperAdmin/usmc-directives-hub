// APPLICATION_CONFIG: UI, layout, and message-type rendering rules
const APPLICATION_CONFIG = {
  MESSAGE_TEMPLATES: {
    maradmin: { subjectSource: 'subject', showAISummary: true, showDetails: true, prependIdToTitle: true, hideIdColumn: true },
    mcpub: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    almar: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    semperadmin: { subjectSource: 'subject', showAISummary: false, showDetails: false, linkSource: 'semperadminLink', prependIdToTitle: false, hideIdColumn: true },
    dodforms: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    dodfmr: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: false, hideIdColumn: true },
    fachecklists: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    youtube: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    alnav: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    secnav: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    jtr: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: true }
  }
};

// RSS Feed URLs
const RSS_FEEDS = {
  maradmin: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=500&category=14336",
  mcpub: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=5&Site=481&max=500",
  almar: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=500&category=14335",
  // semperadmin now uses Facebook Graph API via /api/facebook/semperadmin endpoint
  alnav: null, // RSS feed broken - using direct HTML scraping via fetchAlnavMessages()
  secnav: "https://rss.app/feeds/gtjRe8dzN4BUYIrV.xml",
  jtr: "https://www.travel.dod.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1311&Category=22932&isdashboardselected=0&max=500"
};

// YouTube Data API v3 configuration
// API keys moved to backend for security - DO NOT add keys here
const YOUTUBE_MAX_RESULTS = 500; // per page

// ALNAV URLs - Direct HTML scraping from Navy website (RSS feed broken)
function getAlnavUrls() {
  const currentYear = new Date().getFullYear();
  const urls = [];

  // Fetch ALNAV messages from current year and previous 2 years
  for (let i = 0; i < 3; i++) {
    const year = currentYear - i;
    urls.push(`https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year}/`);
  }

  return urls;
}

// SECNAV URLs - Now using RSS feed (deprecated HTML scraping removed)
function getSecnavUrls() {
  return [RSS_FEEDS.secnav];
}

// DoD FMR URLs - Department of Defense Financial Management Regulation
function getDodFmrUrls() {
  // DoD FMR change pages
  return ['https://comptroller.war.gov/FMR/change/'];
}

// DoD Forms URLs
const DOD_FORMS_URLS = [
  "https://www.esd.whs.mil/Directives/forms/dd0001_0499/",
  "https://www.esd.whs.mil/Directives/forms/dd0500_0999/",
  "https://www.esd.whs.mil/Directives/forms/dd1000_1499/",
  "https://www.esd.whs.mil/Directives/forms/dd1500_1999/",
  "https://www.esd.whs.mil/Directives/forms/dd2000_2499/",
  "https://www.esd.whs.mil/Directives/forms/dd2500_2999/",
  "https://www.esd.whs.mil/Directives/forms/dd3000_3499/"
];

// Custom Proxy Server Configuration
// Set this to your deployed proxy server URL to bypass CORS issues
// Examples:
//   - Node.js server: "https://your-app.onrender.com"
//   - Cloudflare Worker: "https://usmc-directives-proxy.your-subdomain.workers.dev"
//   - Local server: "http://localhost:3000"
// Leave empty to use fallback CORS proxies (unreliable)
// Prefer local proxy during development; fall back to deployed URL otherwise
const CUSTOM_PROXY_URL = (() => {
  const deployed = "https://usmc-directives-proxy.onrender.com";
  const local = "http://localhost:3000";
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return local;
      }
    }
  } catch (_) {
    // Ignore detection errors and use deployed URL
  }
  return deployed;
})();

console.log('[Proxy] Using proxy base URL:', CUSTOM_PROXY_URL);

// Multiple CORS proxies to try as fallbacks (these are unreliable)
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.codetabs.com/v1/proxy?quest="
];

const refreshBtn = document.getElementById("refreshBtn");
const themeToggle = document.getElementById("themeToggle");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");
const resultsDiv = document.getElementById("results");
const summaryStatsDiv = document.getElementById("summaryStats");
const lastUpdateSpan = document.getElementById("lastUpdate");
const searchInput = document.getElementById("searchInput");
const dateRangeSelect = document.getElementById("dateRange");
const clearSearchBtn = document.getElementById("clearSearch");
const messageTypeButtons = document.querySelectorAll(".message-type-btn");
const quickFilterButtons = document.querySelectorAll(".quick-filter-btn");

// Gemini API configuration - API keys moved to backend for security

let currentMessages = [];
let allMaradmins = []; // Store all MARADMINs
let allMcpubs = []; // Store all MCPUBs
let allAlnavs = []; // Store all ALNAVs
let allAlmars = []; // Store all ALMARs
let allSemperAdminPosts = []; // Store all Semper Admin posts
let allDodForms = []; // Store all DoD Forms
let allFaChecklists = []; // Store all FA Checklists
let allYouTubePosts = []; // Store all YouTube posts
let allSecnavs = []; // Store all SECNAV directives
let allJtrs = []; // Store all JTR (Joint Travel Regulations) updates
let allDodFmr = []; // Store all DoD FMR changes
let currentMessageType = 'maradmin'; // Track current view: 'maradmin', 'mcpub', 'alnav', 'almar', 'semperadmin', 'dodforms', 'fachecklists', 'youtube', 'secnav', 'jtr', 'dodfmr', or 'all'
let summaryCache = {}; // Cache for AI-generated summaries

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadCachedData();
  loadFaChecklists(); // Load FA Checklists from static data file
  restoreFilterPreferences();
  fetchAllFeeds();
  initTheme();
  startAutoRefresh();
  initStickyHeader();
  initKeyboardShortcuts();
});
refreshBtn.addEventListener("click", () => {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "🔄 Refreshing...";
  loadFaChecklists(); // Reload FA Checklists from static data file
  fetchAllFeeds().then(() => {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "🔄 Refresh";
  });
});
themeToggle.addEventListener("click", toggleTheme);
// Debounce search input for better performance (300ms delay)
searchInput.addEventListener("input", debounce(filterMessages, 300));
dateRangeSelect.addEventListener("change", handleDateRangeChange);
clearSearchBtn.addEventListener("click", clearSearch);
messageTypeButtons.forEach(btn => {
  btn.addEventListener("click", () => switchMessageType(btn.dataset.type));
});
quickFilterButtons.forEach(btn => {
  btn.addEventListener("click", () => handleQuickFilter(btn));
});

// Show skeleton loading placeholders
function showSkeletonLoaders() {
  statusDiv.textContent = "Loading...";
  resultsDiv.innerHTML = `
    <div class="skeleton-loader">
      ${Array(8).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="compact-card-header">
            <div class="skeleton-item" style="height: 28px; width: 80%;"></div>
          </div>
          <div class="compact-card-details">
            <div>
              <div class="skeleton-item" style="height: 12px; width: 40%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton-item" style="height: 20px; width: 70%;"></div>
            </div>
            <div>
              <div class="skeleton-item" style="height: 12px; width: 50%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton-item" style="height: 20px; width: 80%;"></div>
            </div>
            <div>
              <div class="skeleton-item" style="height: 12px; width: 40%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton-item" style="height: 24px; width: 60%;"></div>
            </div>
            <div>
              <div class="skeleton-item" style="height: 12px; width: 50%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton-item" style="height: 30px; width: 90%;"></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Hide skeleton loaders
function hideSkeletonLoaders() {
  const skeletons = document.querySelectorAll('.skeleton-loader');
  skeletons.forEach(skeleton => skeleton.remove());
}

// Fetch all RSS feeds (MARADMINs, MCPUBs, ALNAVs, ALMARs, and Semper Admin)
async function fetchAllFeeds() {
  showSkeletonLoaders();
  errorDiv.classList.add("hidden");

  // Fetch all feed types
  await fetchFeed('maradmin', RSS_FEEDS.maradmin);
  await fetchFeed('mcpub', RSS_FEEDS.mcpub);
  // await fetchFeed('alnav', RSS_FEEDS.alnav); // Replaced by fetchAlnavMessages due to broken RSS feed
  await fetchAlnavMessages(); // Fetch ALNAV using direct HTML scraping
  await fetchFeed('almar', RSS_FEEDS.almar);
  await fetchSemperAdminPosts(); // Fetch from Facebook API
  await fetchYouTubeVideos(); // Fetch from YouTube Data API
  await fetchFeed('secnav', RSS_FEEDS.secnav); // Fetch SECNAV from RSS feed
  await fetchFeed('jtr', RSS_FEEDS.jtr); // Fetch JTR (Joint Travel Regulations) updates

  // Fetch DoD Forms
  await fetchDodForms();

  // Fetch DoD FMR changes
  await fetchDodFmrChanges();

  // Update display
  filterMessages();
  updateLastUpdate();
  updateTabCounters();
}

// Fetch a specific RSS feed
async function fetchFeed(type, url) {
  console.log(`Fetching ${type.toUpperCase()}s...`);

  // Try custom proxy server first if configured (most reliable)
  if (CUSTOM_PROXY_URL) {
    try {
      const proxyUrl = `${CUSTOM_PROXY_URL}/api/proxy?url=${encodeURIComponent(url)}`;
      console.log(`Trying custom proxy for ${type}...`);

      // Retry logic for when proxy is spinning up (Render free tier)
      let retries = 3;
      let delay = 2000; // Start with 2 second delay

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(proxyUrl, { timeout: 15000 });
          if (response.ok) {
            const text = await response.text();
            processRSSData(text, type);
            return;
          }
          // If we get a response but it's not ok, don't retry
          if (response.status !== 503 && response.status !== 502) {
            break;
          }
        } catch(fetchErr) {
          if (attempt < retries - 1) {
            console.log(`Custom proxy attempt ${attempt + 1} failed, retrying in ${delay/1000}s...`);
            statusDiv.textContent = `Waking up proxy server... (${attempt + 1}/${retries})`;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
          }
        }
      }
    } catch(err) {
      console.log(`Custom proxy failed for ${type}, trying direct fetch...`, err.message);
    }
  }

  // Try direct fetch
  try {
    const text = await tryDirectFetch(url);
    if (text) {
      processRSSData(text, type);
      return;
    }
  } catch(err) {
    console.log(`Direct fetch for ${type} failed, trying fallback proxies...`, err);
  }

  // Try each fallback CORS proxy
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    try {
      statusDiv.textContent = `Fetching ${type.toUpperCase()}s... (attempt ${i + 1}/${CORS_PROXIES.length})`;
      const text = await tryProxyFetch(CORS_PROXIES[i], url);
      if (text) {
        processRSSData(text, type);
        return;
      }
    } catch(err) {
      console.log(`Proxy ${i + 1} failed for ${type}:`, err.message);
      if (i === CORS_PROXIES.length - 1) {
        // Last proxy failed
        const messages = type === 'maradmin' ? allMaradmins : allMcpubs;
        if (messages.length === 0) {
          showError(
            `Unable to fetch ${type.toUpperCase()}s.`,
            'All connection methods failed. Please check your internet connection or try again later.',
            'error'
          );
        }
      }
    }
  }
}

// Try direct fetch without proxy
async function tryDirectFetch(url) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), 10000)
  );

  const fetchPromise = fetch(url, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache'
  });

  const response = await Promise.race([fetchPromise, timeoutPromise]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

// Try fetch with a specific CORS proxy with timeout
async function tryProxyFetch(proxy, rssUrl) {
  const url = proxy.includes('allorigins')
    ? proxy + encodeURIComponent(rssUrl)
    : proxy + rssUrl;

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

/**
 * Process the RSS data once fetched
 * @param {string} text - Raw RSS/XML text
 * @param {string} type - Message type (maradmin, mcpub, alnav, etc.)
 */
function processRSSData(text, type) {
  const parsed = parseRSS(text, type);
  parsed.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));

  if (type === 'maradmin') {
    allMaradmins = parsed;
  } else if (type === 'mcpub') {
    allMcpubs = parsed;
  } else if (type === 'almar') {
    allAlmars = parsed;
  } else if (type === 'youtube') {
    allYouTubePosts = parsed;
  } else if (type === 'alnav') {
    allAlnavs = parsed;
  } else if (type === 'secnav') {
    // SECNAV now has its own dedicated RSS feed
    allSecnavs = parsed;
  } else if (type === 'jtr') {
    // JTR (Joint Travel Regulations) updates
    allJtrs = parsed;
  }
  // Note: semperadmin now uses Facebook Graph API, not RSS

  cacheData();
  console.log(`Loaded ${parsed.length} ${type.toUpperCase()}s`);
}

// Fetch and parse DoD Forms from all pages
async function fetchDodForms() {
  console.log('Fetching DoD Forms from 7 pages...');

  try {
    const allForms = [];

    // Fetch all pages in parallel
    const promises = DOD_FORMS_URLS.map(url => fetchDodFormsPage(url));
    const results = await Promise.allSettled(promises);

    // Collect all successful results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allForms.push(...result.value);
        console.log(`Loaded ${result.value.length} forms from page ${index + 1}`);
      } else {
        console.error(`Failed to load page ${index + 1}:`, result.reason);
      }
    });

    // Remove duplicates based on form number
    const uniqueForms = [];
    const seen = new Set();
    for (const form of allForms) {
      if (!seen.has(form.id)) {
        seen.add(form.id);
        uniqueForms.push(form);
      }
    }

    // Sort by form number
    uniqueForms.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    allDodForms = uniqueForms;
    cacheData();
    console.log(`Total DoD Forms loaded: ${allDodForms.length}`);
  } catch (error) {
    console.error('Error fetching DoD Forms:', error);
  }
}

// Fetch and parse a single DoD Forms page
async function fetchDodFormsPage(url) {
  try {
    // Try direct fetch first
    let text = await tryDirectFetch(url);

    // If direct fails, try proxies
    if (!text) {
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
          text = await tryProxyFetch(CORS_PROXIES[i], url);
          if (text) break;
        } catch (err) {
          console.log(`Proxy ${i + 1} failed for DoD Forms page, trying next...`);
        }
      }
    }

    if (!text) {
      throw new Error('All fetch attempts failed');
    }

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    return parseDodFormsTable(doc, url);
  } catch (error) {
    console.error(`Error fetching DoD Forms page ${url}:`, error);
    return [];
  }
}

// Parse DoD Forms table from HTML document
function parseDodFormsTable(doc, sourceUrl) {
  const forms = [];

  // Find table rows (skip header row)
  const rows = Array.from(doc.querySelectorAll('table tbody tr'));

  rows.forEach(row => {
    try {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;

      const linkElem = row.querySelector('a');
      const number = cells[0]?.textContent.trim() || '';
      const title = cells[1]?.textContent.trim() || '';
      const edition = cells[2]?.textContent.trim() || '';
      const controlled = cells[3]?.textContent.trim() || '';
      const opr = cells[4]?.textContent.trim() || '';

      if (!number) return;

      // Parse date from edition field
      let pubDate = new Date();
      let pubDateObj = new Date();
      if (edition) {
        try {
          pubDateObj = new Date(edition);
          if (isNaN(pubDateObj.getTime())) {
            pubDateObj = new Date();
          }
          pubDate = pubDateObj.toISOString();
        } catch (e) {
          pubDate = new Date().toISOString();
          pubDateObj = new Date();
        }
      }

      const form = {
        id: number,
        subject: title,
        link: linkElem ? new URL(linkElem.href, sourceUrl).href : sourceUrl,
        pubDate: pubDate,
        pubDateObj: pubDateObj,
        type: 'dodforms',
        edition: edition,
        controlled: controlled,
        opr: opr,
        searchText: `${number} ${title} ${opr} ${controlled}`.toLowerCase()
      };

      forms.push(form);
    } catch (error) {
      console.error('Error parsing DoD Forms row:', error);
    }
  });

  return forms;
}

// Fetch and parse ALNAV messages from Navy website
async function fetchAlnavMessages() {
  console.log('Fetching ALNAV messages from Navy website...');

  try {
    const urls = getAlnavUrls();
    const allMessages = [];

    // Fetch all ALNAV pages
    for (const url of urls) {
      try {
        const messages = await fetchAlnavPage(url);
        allMessages.push(...messages);
        console.log(`Loaded ${messages.length} ALNAVs from ${url}`);
      } catch (error) {
        // console.warn(`Skip ${url}:`, error.message);
      }
    }

    // Remove duplicates based on message ID
    const uniqueMessages = [];
    const seen = new Set();
    for (const msg of allMessages) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        uniqueMessages.push(msg);
      }
    }

    // Sort by date (newest first)
    uniqueMessages.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    allAlnavs = uniqueMessages;
    cacheData();
    console.log(`Total ALNAVs loaded: ${allAlnavs.length}`);
  } catch (error) {
    console.error('Error fetching ALNAV messages:', error);
  }
}

// Fetch and parse a single ALNAV page
async function fetchAlnavPage(url) {
  try {
    let text;

    // Try custom proxy first if configured
    if (CUSTOM_PROXY_URL) {
      try {
        const year = url.match(/ALNAV-(\d{4})/)?.[1] || new Date().getFullYear();
        const proxyUrl = `${CUSTOM_PROXY_URL}/api/alnav/${year}`;
        console.log(`Using custom proxy for ALNAV: ${proxyUrl}`);

        const response = await fetch(proxyUrl);
        if (response.ok) {
          text = await response.text();
          console.log('Custom proxy succeeded for ALNAV');
        }
      } catch (err) {
        // console.log('Custom proxy failed for ALNAV, trying direct fetch...', err.message);
      }
    }

    // Try direct fetch if custom proxy not configured or failed
    if (!text) {
      try {
        text = await tryDirectFetch(url);
      } catch (err) {
        console.log('Direct fetch failed for ALNAV, trying fallback proxies...');
      }
    }

    // If direct fails, try fallback proxies
    if (!text) {
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
          text = await tryProxyFetch(CORS_PROXIES[i], url);
          if (text) break;
        } catch (err) {
          console.log(`Proxy ${i + 1} failed for ALNAV page, trying next...`);
        }
      }
    }

    if (!text) {
      throw new Error('All fetch attempts failed');
    }

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    return parseAlnavLinks(doc, url);
  } catch (error) {
    // console.error(`Error fetching ALNAV page ${url}:`, error);
    return [];
  }
}

// Parse ALNAV links from HTML document
function parseAlnavLinks(doc, sourceUrl) {
  const messages = [];

  // Find all links to PDF, MSG, or TXT files
  const links = doc.querySelectorAll('a[href$=".pdf"], a[href$=".msg"], a[href$=".txt"], a[href$=".PDF"], a[href$=".MSG"], a[href$=".TXT"]');

  console.log(`parseAlnavLinks: Found ${links.length} potential ALNAV links`);

  links.forEach(link => {
    try {
      const title = link.textContent.trim();
      const href = new URL(link.getAttribute('href'), sourceUrl).href;

      if (!title || !href) {
        console.log('Skipping link - no title or href:', { title, href });
        return;
      }

      // Extract ALNAV number from title or filename
      // Examples: "ALNAV 001/25", "ALNAV 001-25", "001-25.pdf"
      const alnavMatch = title.match(/ALNAV[_\s-]*(\d{3})[\/\-](\d{2,4})/i) ||
                         href.match(/ALNAV[_\s-]*(\d{3})[\/\-](\d{2,4})/i) ||
                         title.match(/(\d{3})[\/\-](\d{2,4})/) ||
                         href.match(/(\d{3})[\/\-](\d{2,4})/);

      if (!alnavMatch) {
        console.log('No ALNAV pattern match:', { title, href });
        return;
      }

      const number = alnavMatch[1];
      let year = alnavMatch[2];

      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        year = century + parseInt(year);

        // If year is more than 10 years in the future, it's probably from the past century
        if (year > currentYear + 10) {
          year -= 100;
        }
      }

      const id = `ALNAV ${number}/${year}`;

      // Try to extract date from title or use current date as fallback
      let pubDate = new Date();
      let pubDateObj = new Date();

      // Look for date in title (various formats)
      const dateMatch = title.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i) ||
                        title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ||
                        title.match(/(\d{4})-(\d{2})-(\d{2})/);

      if (dateMatch) {
        try {
          pubDateObj = new Date(dateMatch[0]);
          if (!isNaN(pubDateObj.getTime())) {
            pubDate = pubDateObj.toISOString();
          }
        } catch (e) {
          // Use default date
        }
      } else {
        // Use year from ALNAV number
        pubDateObj = new Date(year, 0, 1);
        pubDate = pubDateObj.toISOString();
      }

      const message = {
        id: id,
        subject: title,
        link: href,
        pubDate: pubDate,
        pubDateObj: pubDateObj,
        type: 'alnav',
        searchText: `${id} ${title}`.toLowerCase()
      };

      messages.push(message);
    } catch (error) {
      console.error('Error parsing ALNAV link:', error);
    }
  });

  console.log(`parseAlnavLinks: Parsed ${messages.length} ALNAVs from ${links.length} links`);
  return messages;
}

// Fetch YouTube videos using YouTube Data API v3
async function fetchYouTubeVideos() {
  console.log('Fetching YouTube videos from YouTube Data API...');

  try {
    let videos = [];
    let pageToken = '';
    let pageCount = 0;
    const maxPages = 20; // Limit to 20 pages (1000 videos max)

    do {
      try {
        // Use backend API endpoint instead of direct YouTube API call
        const apiUrl = CUSTOM_PROXY_URL
          ? `${CUSTOM_PROXY_URL}/api/youtube/videos`
          : null;

        if (!apiUrl) {
          console.warn('Proxy server not configured. Skipping YouTube fetch.');
          break;
        }

        // Build API URL
        const url = new URL(apiUrl);
        url.searchParams.set('maxResults', '50'); // Server enforces max of 50
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        // Fetch from backend API
        const response = await fetch(url.toString());

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`YouTube API error (${response.status}):`, errorText);
          break;
        }

        const data = await response.json();

        // Parse items
        if (data.items && data.items.length > 0) {
          data.items.forEach(item => {
            if (item.id.videoId) {
              const videoId = item.id.videoId;
              const title = item.snippet.title;
              const publishedAt = item.snippet.publishedAt;
              const url = `https://www.youtube.com/watch?v=${videoId}`;
              const description = item.snippet.description || '';

              videos.push({
                id: videoId,
                numericId: videoId,
                subject: title,
                title: title,
                link: url,
                pubDate: new Date(publishedAt).toISOString(),
                pubDateObj: new Date(publishedAt),
                summary: description.substring(0, 200),
                description: description,
                category: '',
                type: 'youtube',
                searchText: `${videoId} ${title} ${description}`.toLowerCase(),
                detailsFetched: false,
                maradminNumber: null
              });
            }
          });

          console.log(`Fetched page ${pageCount + 1}: ${data.items.length} videos (total: ${videos.length})`);
        }

        // Check for next page
        pageToken = data.nextPageToken || '';
        pageCount++;

        // Stop if no more pages or reached limit
        if (!pageToken || videos.length >= 1000 || pageCount >= maxPages) {
          break;
        }

      } catch (pageError) {
        console.error('Error fetching YouTube page:', pageError);
        break;
      }
    } while (pageToken && pageCount < maxPages);

    allYouTubePosts = videos;
    cacheData();
    console.log(`Total YouTube videos loaded: ${allYouTubePosts.length}`);
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
  }
}

// Fetch Semper Admin posts from Facebook API via backend proxy
async function fetchSemperAdminPosts() {
  console.log('🔵 [Semper Admin] Starting Facebook API fetch...');

  try {
    // Use backend API endpoint for Facebook posts
    const apiUrl = CUSTOM_PROXY_URL
      ? `${CUSTOM_PROXY_URL}/api/facebook/semperadmin`
      : null;

    console.log('🔵 [Semper Admin] Proxy URL:', CUSTOM_PROXY_URL);
    console.log('🔵 [Semper Admin] API endpoint:', apiUrl);

    if (!apiUrl) {
      console.error('❌ [Semper Admin] Proxy server not configured. Skipping Semper Admin fetch.');
      return;
    }

    console.log('🔵 [Semper Admin] Fetching from:', apiUrl);
    const response = await fetch(apiUrl);

    console.log('🔵 [Semper Admin] Response status:', response.status);
    console.log('🔵 [Semper Admin] Response ok:', response.ok);
    console.log('🔵 [Semper Admin] Response headers:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Semper Admin] Facebook API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      return;
    }

    const data = await response.json();
    console.log('🔵 [Semper Admin] Raw response data:', data);
    console.log('🔵 [Semper Admin] data.success:', data.success);
    console.log('🔵 [Semper Admin] data.posts:', data.posts ? `${data.posts.length} posts` : 'undefined');

    if (!data.success || !data.posts) {
      console.error('❌ [Semper Admin] Invalid response from Facebook API:', {
        success: data.success,
        postsExists: !!data.posts,
        postsLength: data.posts?.length,
        error: data.error,
        message: data.message,
        fullData: data
      });
      return;
    }

    console.log('🔵 [Semper Admin] Processing', data.posts.length, 'posts...');

    // Parse Facebook posts into our message format
    const posts = data.posts.map((post, index) => {
      // Extract post ID (use Facebook post ID or generate one)
      const postId = post.id || `Post ${index + 1}`;

      // Use message as subject, or fall back to a default
      const subject = post.message || post.story || `Semper Admin Update ${index + 1}`;

      // Get permalink URL
      const link = post.permalink_url || `https://www.facebook.com/${postId}`;

      // Parse creation date
      const pubDate = post.created_time ? new Date(post.created_time) : new Date();

      // Extract description/summary (first sentence of message)
      const description = post.message || post.story || '';
      const summary = firstSentence(description);

      return {
        id: postId,
        numericId: postId,
        subject: subject.substring(0, 200), // Limit length
        title: subject,
        link: link,
        semperadminLink: link, // Use for config.linkSource
        pubDate: pubDate.toISOString(),
        pubDateObj: pubDate,
        summary: summary,
        description: description,
        category: '',
        type: 'semperadmin',
        searchText: `${postId} ${subject} ${description}`.toLowerCase(),
        detailsFetched: false,
        maradminNumber: null
      };
    });

    allSemperAdminPosts = posts;
    cacheData();
    console.log('✅ [Semper Admin] Total Semper Admin posts loaded:', allSemperAdminPosts.length);
  } catch (error) {
    console.error('❌ [Semper Admin] Error fetching Semper Admin posts:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Fetch and parse DoD FMR changes from DoD website
async function fetchDodFmrChanges() {
  console.log('Fetching DoD FMR changes from DoD website...');

  try {
    const urls = getDodFmrUrls();
    const allMessages = [];

    // Fetch all DoD FMR pages
    for (const url of urls) {
      try {
        const messages = await fetchDodFmrPage(url);
        allMessages.push(...messages);
        console.log(`Loaded ${messages.length} DoD FMR changes from ${url}`);
      } catch (error) {
        console.warn(`Skip ${url}:`, error.message);
      }
    }

    // Remove duplicates based on message ID
    const uniqueMessages = [];
    const seen = new Set();
    for (const msg of allMessages) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        uniqueMessages.push(msg);
      }
    }

    // Sort by date (newest first)
    uniqueMessages.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    allDodFmr = uniqueMessages;
    cacheData();
    console.log(`Total DoD FMR changes loaded: ${allDodFmr.length}`);
  } catch (error) {
    console.error('Error fetching DoD FMR changes:', error);
  }
}

// Fetch and parse a single DoD FMR page
async function fetchDodFmrPage(url) {
  try {
    console.log(`Fetching DoD FMR page: ${url}`);

    // Try direct fetch first with timeout
    let text = null;
    try {
      const directResponse = await Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      if (directResponse.ok) {
        text = await directResponse.text();
      }
    } catch (directError) {
      console.log('Direct fetch failed, trying CORS proxies...');
    }

    // If direct fetch failed, try CORS proxies
    if (!text) {
      for (const proxy of CORS_PROXIES) {
        try {
          const proxyUrl = proxy.includes('allorigins')
            ? proxy + encodeURIComponent(url)
            : proxy + url;

          const response = await Promise.race([
            fetch(proxyUrl),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);

          if (response.ok) {
            text = await response.text();
            if (proxy.includes('allorigins')) {
              const json = JSON.parse(text);
              text = json.contents;
            }
            break;
          }
        } catch (proxyError) {
          continue;
        }
      }
    }

    if (!text) {
      throw new Error('All fetch attempts failed');
    }

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    return parseDodFmrLinks(doc, url);
  } catch (error) {
    console.error(`Error fetching DoD FMR page ${url}:`, error);
    return [];
  }
}

// Parse DoD FMR change links from HTML document
function parseDodFmrLinks(doc, sourceUrl) {
  const messages = [];

  // Find all links to PDF files and relevant content
  const links = doc.querySelectorAll('a[href*=".pdf"], a[href*=".PDF"], a[href*="change"]');

  links.forEach(link => {
    try {
      const title = link.textContent.trim();
      const href = new URL(link.getAttribute('href'), sourceUrl).href;

      if (!title || !href) return;

      // Extract FMR change identifier from title or filename
      // Examples: "FMR Change 123", "Change Notice 456", "Volume 7A, Chapter 8"
      const changeMatch = title.match(/Change\s+(?:Notice\s+)?(\d+)/i) ||
                         title.match(/FMR\s+Change\s+(\d+)/i) ||
                         href.match(/change[_-]?(\d+)/i);

      let id = null;
      if (changeMatch) {
        id = `FMR Change ${changeMatch[1]}`;
      } else {
        // Try to match volume/chapter patterns
        const volChapterMatch = title.match(/Volume\s+(\d+[A-Z]?),?\s+Chapter\s+(\d+)/i);
        if (volChapterMatch) {
          id = `FMR Vol ${volChapterMatch[1]} Ch ${volChapterMatch[2]}`;
        } else {
          // Use first 50 characters of title as ID
          id = title.substring(0, 50);
        }
      }

      if (id) {
        const message = createDodFmrMessage(id, title, href);
        messages.push(message);
      }
    } catch (error) {
      console.error('Error parsing DoD FMR link:', error);
    }
  });

  return messages;
}

// Helper function to create DoD FMR message object
function createDodFmrMessage(id, title, href) {
  // Try to extract date from title or use a very old date as fallback
  let pubDate = new Date('2000-01-01');
  let pubDateObj = new Date('2000-01-01');

  // Look for date in title (various formats)
  const dateMatch = title.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i) ||
                    title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) ||
                    title.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (dateMatch) {
    try {
      pubDateObj = new Date(dateMatch[0]);
      if (!isNaN(pubDateObj.getTime())) {
        pubDate = pubDateObj.toISOString();
      }
    } catch (e) {
      pubDate = pubDateObj.toISOString();
    }
  } else {
    pubDate = pubDateObj.toISOString();
  }

  return {
    id: id,
    subject: title,
    link: href,
    pubDate: pubDate,
    pubDateObj: pubDateObj,
    type: 'dodfmr',
    searchText: `${id} ${title}`.toLowerCase()
  };
}

// Load FA Checklists from static data file
function loadFaChecklists() {
  console.log('Loading FA Checklists from static data file...');

  try {
    // Check if FA_CHECKLISTS data is available (loaded from lib/fa-checklists.js)
    if (typeof window.FA_CHECKLISTS === 'undefined' || !Array.isArray(window.FA_CHECKLISTS)) {
      console.warn('FA_CHECKLISTS data not found or invalid');
      allFaChecklists = [];
      return;
    }

    const checklists = window.FA_CHECKLISTS;
    console.log(`Found ${checklists.length} FA Checklists in static data`);

    // Transform FA Checklists data into message format
    allFaChecklists = checklists.map(checklist => {
      // Use effective date as pubDate, or default to current date
      let pubDateObj = new Date();
      if (checklist.effectiveDate) {
        try {
          // Try to parse the effective date (format: "01 Jan 2024")
          const parsedDate = new Date(checklist.effectiveDate);
          if (!isNaN(parsedDate.getTime())) {
            pubDateObj = parsedDate;
          }
        } catch (e) {
          console.warn(`Could not parse date: ${checklist.effectiveDate}`);
        }
      }

      // Create a formatted subject line
      const subject = `${checklist.faNumber}: ${checklist.functionalArea} - ${checklist.category}`;

      // Create description with checklist details
      const description = `
        <strong>FA Number:</strong> ${checklist.faNumber}<br>
        <strong>Functional Area:</strong> ${checklist.functionalArea}<br>
        <strong>Category:</strong> ${checklist.category}<br>
        <strong>Sponsor:</strong> ${checklist.sponsor}<br>
        <strong>Effective Date:</strong> ${checklist.effectiveDate}
      `;

      return {
        id: checklist.faNumber,
        subject: subject,
        link: window.FA_CHECKLISTS_META?.sourceUrl || 'https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/',
        pubDate: pubDateObj.toISOString(),
        pubDateObj: pubDateObj,
        type: 'fachecklists',
        description: description,
        searchText: `${checklist.faNumber} ${checklist.functionalArea} ${checklist.category} ${checklist.sponsor}`.toLowerCase(),
        // Include original checklist data for reference
        faChecklist: checklist
      };
    });

    // Sort by FA Number
    allFaChecklists.sort((a, b) => {
      const aNum = a.faChecklist.faNumber || '';
      const bNum = b.faChecklist.faNumber || '';
      return aNum.localeCompare(bNum);
    });

    console.log(`Loaded ${allFaChecklists.length} FA Checklists`);

    // Log metadata if available
    if (window.FA_CHECKLISTS_META) {
      console.log('[FA Checklists] Source:', window.FA_CHECKLISTS_META.sourceUrl);
      console.log('[FA Checklists] Generated:', window.FA_CHECKLISTS_META.generatedAt);
    }
  } catch (error) {
    console.error('Error loading FA Checklists:', error);
    allFaChecklists = [];
  }
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
    const bodyText = doc.body?.textContent || '';

    if (message.type === 'maradmin') {
      // Extract MARADMIN number from content
      const maradminMatch = bodyText.match(/MARADMIN\s+(?:NUMBER\s+)?(\d+[-\/]\d+)/i);

      if (maradminMatch) {
        message.maradminNumber = maradminMatch[1];
        message.id = `MARADMIN ${maradminMatch[1]}`;
      }

    } else if (message.type === 'mcpub') {
      // Extract PDF download link for MCPUBs
      const pdfLinkElement = doc.querySelector('a.button-primary[href*=".pdf"]');

      if (pdfLinkElement) {
        let pdfUrl = pdfLinkElement.getAttribute('href');

        // Make sure it's an absolute URL
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = 'https://www.marines.mil' + pdfUrl;
        }

        message.pdfUrl = pdfUrl;

        // Extract publication title from the link
        const titleElement = pdfLinkElement.querySelector('.relatedattachmenttitle');
        if (titleElement) {
          const pubTitle = titleElement.textContent.trim();
          message.id = pubTitle;
        }
      }

      // Extract basic info for MCPUBs
      message.mcpubInfo = extractMCPubInfo(bodyText);
    }

    message.detailsFetched = true;

    // Update cache
    cacheData();

    console.log(`Fetched details for ${message.id}:`, message);
    return message;

  } catch(error) {
    console.error(`Error fetching details for ${message.id}:`, error);
    message.detailsFetched = true; // Mark as attempted
    return message;
  }
}

// Extract MCPub specific information
function extractMCPubInfo(content) {
  const info = {
    description: '',
    subject: '',
    effectiveDate: ''
  };

  // Look for subject/description
  const subjectMatch = content.match(/(?:subject|description)[:.\s]+([^\n.]+)/i);
  if (subjectMatch) {
    info.subject = subjectMatch[1].trim().substring(0, 200);
  }

  // Look for effective date
  const dateMatch = content.match(/effective(?:\s+date)?[:.\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
  if (dateMatch) {
    info.effectiveDate = dateMatch[1];
  }

  return info;
}

// Generate AI summary for a message using Gemini API
async function generateAISummary(message, buttonElement) {
  const messageKey = `${message.type}_${message.numericId}`;

  // Check local cache first
  if (summaryCache[messageKey]) {
    return summaryCache[messageKey];
  }

  try {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = '⏳';
    }

    // Check proxy server for existing summary (shared across all users)
    if (CUSTOM_PROXY_URL) {
      try {
        const serverResponse = await fetch(`${CUSTOM_PROXY_URL}/api/summary/${encodeURIComponent(messageKey)}`);
        if (serverResponse.ok) {
          const data = await serverResponse.json();
          if (data.success && data.summary) {
            console.log(`Found cached summary on server for ${messageKey}`);
            summaryCache[messageKey] = data.summary;
            message.aiSummary = data.summary;
            cacheData();

            if (buttonElement) {
              buttonElement.textContent = '🤖';
              buttonElement.disabled = false;
            }
            return data.summary;
          }
        }
      } catch (serverError) {
        console.log('Server cache check failed, will generate new summary:', serverError.message);
      }
    }

    // Try to fetch message content
    const response = await fetch(message.link);
    if (!response.ok) {
      throw new Error('Failed to fetch message content');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyText = doc.body?.textContent || '';

    // Extract the main message content
    let messageContent = bodyText;
    const gentextMatch = bodyText.match(/GENTEXT.*?(?=Release authorized|$)/is);
    if (gentextMatch) {
      messageContent = gentextMatch[0];
    } else {
      const subjMatch = bodyText.match(/SUBJ\/.*?(?=Release authorized|$)/is);
      if (subjMatch) {
        messageContent = subjMatch[0];
      }
    }

    // Limit content length for API
    messageContent = messageContent.substring(0, 8000);

    // Generate summary using Gemini API
    const summary = await callGeminiAPI(messageContent, message);

    // Cache the summary locally
    summaryCache[messageKey] = summary;
    message.aiSummary = summary;

    // Save to local storage
    cacheData();

    // Save to proxy server for sharing across users
    if (CUSTOM_PROXY_URL) {
      try {
        await fetch(`${CUSTOM_PROXY_URL}/api/summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageKey,
            summary,
            messageType: message.type,
            messageId: message.numericId
          })
        });
        console.log(`Saved summary to server for ${messageKey}`);
      } catch (serverError) {
        console.error('Failed to save summary to server:', serverError);
        // Continue anyway - local cache still works
      }
    }

    if (buttonElement) {
      buttonElement.textContent = '🤖';
      buttonElement.disabled = false;
    }

    return summary;

  } catch (error) {
    console.error('Error generating AI summary:', error);
    if (buttonElement) {
      buttonElement.textContent = '❌';
      buttonElement.disabled = false;
    }
    throw error;
  }
}

/**
 * Call Gemini API to generate formatted summary
 * @param {string} content - Message content to summarize
 * @param {Object} message - Message object with metadata
 * @returns {Promise<string>} Formatted summary text
 */
async function callGeminiAPI(content, message) {
  const prompt = `You are a military document summarizer. Your task is to analyze this ${message.type.toUpperCase()} message and create a structured summary.

YOU MUST FOLLOW THIS EXACT FORMAT - DO NOT DEVIATE:

💰 [WRITE THE MAIN TITLE IN ALL CAPS HERE] 💰
---
**5W OVERVIEW:**
* **WHO:** [Write who is affected - units, personnel, ranks, etc.]
* **WHAT:** [Write what is the main action, change, or requirement]
* **WHEN:** [Write the effective date or deadline - format as "DD MMM YYYY" or "N/A"]
* **WHERE:** [Write where this applies - location, command, worldwide, etc.]
* **WHY:** [Write the reason or purpose in one sentence]

---
🎯 **KEY POINTS/ACTIONS:**

[WRITE SECTION HEADERS IN ALL CAPS]
• [Bullet point with key action or information]
• [Another bullet point]
• [Continue with all important details]

[ANOTHER SECTION HEADER IN ALL CAPS]
• [More bullet points as needed]

CRITICAL RULES:
1. Start with the title line EXACTLY as shown above
2. Include ALL FIVE W's in the 5W OVERVIEW section - do not skip any
3. Keep each W answer to ONE LINE
4. Use bullet points (•) for all lists
5. Section headers MUST be in ALL CAPS
6. Keep total length under 500 words
7. Focus on actionable information and deadlines

Message to analyze:
${content}`;


  try {
    // Use backend API endpoint instead of direct Gemini API call
    const apiUrl = CUSTOM_PROXY_URL
      ? `${CUSTOM_PROXY_URL}/api/gemini/summarize`
      : null;

    if (!apiUrl) {
      throw new Error('Proxy server not configured. Please set CUSTOM_PROXY_URL.');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        messageType: message.type
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.success ? data.summary : 'Summary generation failed';

    return summary;

  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to basic extraction if API fails
    return generateBasicSummary(content, message);
  }
}

// Fallback basic summary generation - follows 5W format
function generateBasicSummary(content, message) {
  let summary = '';

  // Extract subject
  const subjMatch = content.match(/SUBJ\/(.*?)(?:\/\/|REF)/is);
  const subject = subjMatch ? subjMatch[1].trim() : message.subject;

  summary += `💰 ${subject.toUpperCase()} 💰\n---\n`;

  // Try to extract 5Ws from the message content
  summary += `**5W OVERVIEW:**\n`;

  // WHO - Try to extract affected personnel
  const whoMatch = content.match(/(?:applies to|personnel|marines|sailors|all|ranks)[\s:]+([^.\n]{10,100})/i);
  const who = whoMatch ? whoMatch[1].trim() : 'See message for specific personnel';
  summary += `* **WHO:** ${who}\n`;

  // WHAT - Use subject or purpose
  const whatMatch = content.match(/(?:Purpose|Action)[.:]?\s*(?:\d+\.)?\s*([^.\n]{10,150})/is) ||
                    content.match(/(?:This message|This MARADMIN|This order)\s+([^.\n]{10,150})/is);
  const what = whatMatch ? whatMatch[1].trim() : subject;
  summary += `* **WHAT:** ${what}\n`;

  // WHEN - Extract date or deadline
  const whenMatch = content.match(/(?:effective|deadline|due|by|NLT)\s*:?\s*(\d{1,2}\s+[A-Z]{3}\s+\d{4}|\d{6}Z)/i) ||
                    content.match(/R\s+(\d{6}Z\s+[A-Z]+\s+\d{2,4})/i) ||
                    content.match(/Date Signed:\s+(.*?)(?:\||$)/i);
  const when = whenMatch ? whenMatch[1].trim() : message.pubDate ? new Date(message.pubDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'See message for dates';
  summary += `* **WHEN:** ${when}\n`;

  // WHERE - Extract location/scope
  const whereMatch = content.match(/(?:location|worldwide|CONUS|OCONUS|all commands|installations)[\s:]+([^.\n]{5,80})/i);
  const where = whereMatch ? whereMatch[1].trim() : 'All applicable commands';
  summary += `* **WHERE:** ${where}\n`;

  // WHY - Extract purpose
  const whyMatch = content.match(/(?:Purpose|Reason|in order to)[.:]?\s*(?:\d+\.)?\s*([^.\n]{10,150})/is);
  const why = whyMatch ? whyMatch[1].trim() : 'See message for purpose';
  summary += `* **WHY:** ${why}\n`;

  summary += `\n---\n🎯 **KEY POINTS:**\n\n`;

  // Extract purpose/remarks section
  const purposeMatch = content.match(/(?:Purpose|Remarks)[.:]?\s*(?:\d+\.)?\s*(.*?)(?:\n\n|\d+\.|$)/is);
  if (purposeMatch) {
    summary += `**PURPOSE:**\n• ${purposeMatch[1].trim().substring(0, 200)}\n\n`;
  }

  // Extract action items if present
  const actionMatch = content.match(/(?:Action|Required|Marines? (?:are|will|shall|must))[.:]?\s*(?:\d+\.)?\s*(.*?)(?:\n\n|\d+\.|$)/is);
  if (actionMatch) {
    summary += `**REQUIRED ACTION:**\n• ${actionMatch[1].trim().substring(0, 200)}\n\n`;
  }

  // Note that this is a basic summary
  summary += `\n_Note: This is a basic auto-generated summary. For complete details, review the full message._`;

  return summary;
}


// Parse RSS XML - Enhanced to extract more metadata
function parseRSS(xmlText, type){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText,"application/xml");
  // Handle both RSS (item) and Atom (entry) formats
  let items = Array.from(xml.querySelectorAll("item"));
  if (items.length === 0) {
    items = Array.from(xml.querySelectorAll("entry"));
  }

  console.log(`Total RSS items found for ${type}: ${items.length}`);

  const parsed = items.map((item, index) => {
    const title = item.querySelector("title")?.textContent || "";
    // Handle both RSS (link as text) and Atom (link as href attribute)
    let link = item.querySelector("link")?.textContent || "";
    if (!link) {
      link = item.querySelector("link")?.getAttribute("href") || "";
    }
    // Handle both RSS (pubDate) and Atom (published/updated)
    const pubDate = item.querySelector("pubDate")?.textContent ||
                    item.querySelector("published")?.textContent ||
                    item.querySelector("updated")?.textContent || "";
    const description = item.querySelector("description")?.textContent ||
                       item.querySelector("media\\:description")?.textContent ||
                       item.querySelector("summary")?.textContent || "";
    const category = item.querySelector("category")?.textContent || "";

    let id, numericId, subject;

    if (type === 'maradmin') {
      // Extract MARADMIN ID from multiple sources
      let idMatch = title.match(/MARADMIN\s+(\d+[-\/]\d+)/i);
      if (!idMatch && description) {
        idMatch = description.match(/MARADMIN\s+(\d+[-\/]\d+)/i);
      }

      if (idMatch) {
        id = idMatch[0];
        numericId = idMatch[1];
        subject = title.replace(/MARADMIN\s+\d+[-\/]?\d*\s*[-:]?\s*/i, "").trim();
      } else {
        const linkMatch = link.match(/\/Article\/(\d+)\//);
        id = linkMatch ? `Article ${linkMatch[1]}` : `Message ${index + 1}`;
        numericId = linkMatch ? linkMatch[1] : String(index + 1);
        subject = title;
      }
    } else if (type === 'mcpub') {
      // Extract MCPUB ID from title (e.g., "MCO 5110.1D", "MCBUL 5000")
      const mcpubMatch = title.match(/(MCO|MCBUL|MCRP|FMFM|MCWP|NAVMC)\s+[\d.]+[A-Z]*/i);
      if (mcpubMatch) {
        id = mcpubMatch[0];
        numericId = mcpubMatch[0];
        subject = title.replace(/(MCO|MCBUL|MCRP|FMFM|MCWP|NAVMC)\s+[\d.]+[A-Z]*\s*[-:]?\s*/i, "").trim();
      } else {
        const linkMatch = link.match(/\/Article\/(\d+)\//);
        id = linkMatch ? `Article ${linkMatch[1]}` : `MCPUB ${index + 1}`;
        numericId = linkMatch ? linkMatch[1] : String(index + 1);
        subject = title;
      }
    } else if (type === 'alnav') {
      // Extract ALNAV ID from title (e.g., "ALNAV 001/25")
      const alnavMatch = title.match(/ALNAV\s+(\d+[-\/]\d+)/i);
      if (alnavMatch) {
        id = alnavMatch[0];
        numericId = alnavMatch[1];
        subject = title.replace(/ALNAV\s+\d+[-\/]?\d*\s*[-:]?\s*/i, "").trim();
      } else {
        id = `ALNAV ${index + 1}`;
        numericId = String(index + 1);
        subject = title;
      }
    } else if (type === 'almar') {
      // Extract ALMAR ID from description field first, then fall back to title
      let almarMatch = null;
      if (description) {
        almarMatch = description.match(/ALMAR\s+(\d+[-\/]\d+)/i);
      }
      if (!almarMatch) {
        almarMatch = title.match(/ALMAR\s+(\d+[-\/]\d+)/i);
      }

      if (almarMatch) {
        id = almarMatch[0];
        numericId = almarMatch[1];
        subject = title.replace(/ALMAR\s+\d+[-\/]?\d*\s*[-:]?\s*/i, "").trim();
      } else {
        id = `ALMAR ${index + 1}`;
        numericId = String(index + 1);
        subject = title;
      }
    } else if (type === 'secnav') {
      // Extract SECNAV ID from title (e.g., "SECNAV 5000.1")
      const directiveMatch = title.match(/SECNAV\s+[\d.]+[A-Z]*/i);
      if (directiveMatch) {
        id = directiveMatch[0];
        numericId = directiveMatch[0];
        subject = title.replace(/SECNAV\s+[\d.]+[A-Z]*\s*[-:]?\s*/i, "").trim();
      } else {
        id = `SECNAV ${index + 1}`;
        numericId = String(index + 1);
        subject = title;
      }
    } else if (type === 'jtr') {
      // JTR items - use title as-is or extract from RSS feed
      id = title.substring(0, 50);
      numericId = String(index + 1);
      subject = title;
    } else if (type === 'semperadmin') {
      // For Semper Admin posts, use title as-is
      id = title.substring(0, 50);
      numericId = String(index + 1);
      subject = title;
    } else if (type === 'youtube') {
      // For YouTube videos, extract video ID and use title as subject
      const videoIdElement = item.querySelector("yt\\:videoId");
      const videoId = videoIdElement?.textContent || "";

      // If videoId not found in element, try to extract from link
      let extractedId = videoId;
      if (!extractedId && link) {
        const linkMatch = link.match(/watch\?v=([^&]+)/);
        extractedId = linkMatch ? linkMatch[1] : String(index + 1);
      }

      id = extractedId || `Video ${index + 1}`;
      numericId = extractedId || String(index + 1);
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
      type, // Add message type
      searchText: `${id} ${subject} ${cleanDescription}`.toLowerCase(),
      detailsFetched: false,
      maradminNumber: null
    };
  });

  console.log(`Parsed ${parsed.length} ${type.toUpperCase()}s from ${items.length} RSS items`);
  return parsed;
}

// Switch between message types
function switchMessageType(type) {
  currentMessageType = type;

  // Update button states
  messageTypeButtons.forEach(btn => {
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Save preference
  localStorage.setItem('filter_message_type', type);

  filterMessages();
}

// Show humorous error message for ALNAV/SECNAV
function showAlnavSecnavErrorMessage() {
  resultsDiv.innerHTML = `
    <div style="max-width: 800px; margin: 3rem auto; padding: 2rem; background: linear-gradient(135deg, #fff3cd 0%, #f8d7da 100%); border: 3px solid #cc0000; border-radius: 12px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
      <h2 style="color: #cc0000; font-size: 2rem; font-weight: 800; margin-bottom: 1rem; text-transform: uppercase;">
        🦅 SEMPER GUMBY! We're Flexible. 🦅
      </h2>
      <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #cc0000;">
        <p style="color: #333; font-size: 1.1rem; line-height: 1.8; margin: 0;">
          <strong style="color: #cc0000;">Attention to orders!</strong> The official guidance feed is currently under scheduled (but violent) maintenance. The engineers are wrestling with the ${currentMessageType.toUpperCase()} API link to get the latest directives loaded.
        </p>
      </div>
      <p style="color: #721c24; font-size: 1rem; font-weight: 600; margin-top: 1.5rem;">
        ⛔ Do not attempt to pass this point! We'll be back online before you can muster a fresh pot of coffee. Ooh-rah!
      </p>
    </div>
  `;
  statusDiv.textContent = `${currentMessageType.toUpperCase()} feed temporarily unavailable`;

  // Hide summary stats
  const summaryStats = document.getElementById('summaryStats');
  if (summaryStats) {
    summaryStats.classList.add('hidden');
  }
}

// Filter and Search Functions
function filterMessages() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const dateRange = parseInt(dateRangeSelect.value);

  // Show humorous error message for ALNAV/SECNAV
  if (currentMessageType === 'alnav' || currentMessageType === 'secnav') {
    showAlnavSecnavErrorMessage();
    return;
  }

  // Get messages based on current type
  let allMessages = [];
  if (currentMessageType === 'maradmin') {
    allMessages = [...allMaradmins];
  } else if (currentMessageType === 'mcpub') {
    allMessages = [...allMcpubs];
  } else if (currentMessageType === 'almar') {
    allMessages = [...allAlmars];
  } else if (currentMessageType === 'semperadmin') {
    allMessages = [...allSemperAdminPosts];
  } else if (currentMessageType === 'dodforms') {
    allMessages = [...allDodForms];
  } else if (currentMessageType === 'fachecklists') {
    allMessages = [...allFaChecklists];
  } else if (currentMessageType === 'youtube') {
    allMessages = [...allYouTubePosts];
  } else if (currentMessageType === 'jtr') {
    allMessages = [...allJtrs];
  } else if (currentMessageType === 'dodfmr') {
    allMessages = [...allDodFmr];
  } else if (currentMessageType === 'all') {
    // Exclude ALNAV and SECNAV from "All Messages"
    allMessages = [...allMaradmins, ...allMcpubs, ...allAlmars, ...allSemperAdminPosts, ...allDodForms, ...allFaChecklists, ...allYouTubePosts, ...allJtrs, ...allDodFmr];
    allMessages.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));
  }

  console.log(`Starting filter with ${allMessages.length} total ${currentMessageType.toUpperCase()} messages`);
  let filtered = allMessages;

  // Apply date filter
  if (dateRange > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    console.log(`Filtering by date: last ${dateRange} days (since ${cutoffDate.toLocaleDateString()})`);
    filtered = filtered.filter(m => m.pubDateObj >= cutoffDate);
    console.log(`After date filter: ${filtered.length} messages`);
  }

  // Apply search filter
  if (searchTerm) {
    console.log(`Filtering by search term: "${searchTerm}"`);
    filtered = filtered.filter(m => m.searchText.includes(searchTerm));
    console.log(`After search filter: ${filtered.length} messages`);
  }

  currentMessages = filtered;
  renderMaradmins(currentMessages);
  updateResultsCount();
  updateTabCounters();
}

function clearSearch() {
  searchInput.value = "";
  dateRangeSelect.value = "1";

  // Reset quick filter buttons
  quickFilterButtons.forEach(btn => btn.classList.remove('active'));
  quickFilterButtons.forEach(btn => {
    if (btn.dataset.days === "1") btn.classList.add('active');
  });

  filterMessages();
}

// Restore filter preferences from localStorage
function restoreFilterPreferences() {
  // Restore message type
  const savedMessageType = localStorage.getItem('filter_message_type');
  if (savedMessageType && savedMessageType !== 'maradmin') {
    currentMessageType = savedMessageType;
    messageTypeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === savedMessageType);
    });
  }

  // Restore date range
  const savedDateRange = localStorage.getItem('filter_date_range');
  if (savedDateRange) {
    dateRangeSelect.value = savedDateRange;
    // Update quick filter buttons
    quickFilterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.days === savedDateRange);
    });
  }
}

// Handle quick filter button clicks
function handleQuickFilter(button) {
  const days = button.dataset.days;

  // Update button states
  quickFilterButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  // Update dropdown
  dateRangeSelect.value = days;

  // Save preference
  localStorage.setItem('filter_date_range', days);

  // Filter messages
  filterMessages();
}

// Handle date range dropdown change
function handleDateRangeChange() {
  // Clear quick filter active states if using custom dropdown
  quickFilterButtons.forEach(btn => {
    if (btn.dataset.days === dateRangeSelect.value) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Save preference
  localStorage.setItem('filter_date_range', dateRangeSelect.value);

  filterMessages();
}

// Start auto-refresh every 10 minutes
function startAutoRefresh() {
  // Auto-refresh every 10 minutes (600000 ms)
  setInterval(() => {
    console.log('Auto-refreshing feeds...');
    fetchAllFeeds();
  }, 600000); // 10 minutes
}

function updateResultsCount() {
  let totalCount = 0;
  if (currentMessageType === 'maradmin') {
    totalCount = allMaradmins.length;
  } else if (currentMessageType === 'mcpub') {
    totalCount = allMcpubs.length;
  } else if (currentMessageType === 'alnav') {
    totalCount = allAlnavs.length;
  } else if (currentMessageType === 'almar') {
    totalCount = allAlmars.length;
  } else if (currentMessageType === 'semperadmin') {
    totalCount = allSemperAdminPosts.length;
  } else if (currentMessageType === 'dodforms') {
    totalCount = allDodForms.length;
  } else if (currentMessageType === 'youtube') {
    totalCount = allYouTubePosts.length;
  } else if (currentMessageType === 'all') {
    // Exclude ALNAV and SECNAV from All Messages count
    totalCount = allMaradmins.length + allMcpubs.length + allAlmars.length + allSemperAdminPosts.length + allDodForms.length + allYouTubePosts.length + allJtrs.length + allDodFmr.length;
  }

  const typeLabel = currentMessageType === 'all' ? 'Messages' :
                    currentMessageType === 'semperadmin' ? 'Posts' :
                    currentMessageType === 'dodforms' ? 'Forms' :
                    currentMessageType === 'youtube' ? 'Videos' :
                    currentMessageType.toUpperCase() + 's';

  const countText = currentMessages.length === totalCount
    ? `Showing all ${currentMessages.length} ${typeLabel}`
    : `Showing ${currentMessages.length} of ${totalCount} ${typeLabel}`;
  statusDiv.textContent = countText;
}

// Update tab counters with filtered message counts
function updateTabCounters() {
  const dateRange = parseInt(dateRangeSelect.value);
  const searchTerm = searchInput.value.toLowerCase().trim();

  // Helper function to get filtered count for a type
  function getFilteredCount(messages) {
    let filtered = messages;

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

    return filtered.length;
  }

  // Update each tab with its count
  messageTypeButtons.forEach(btn => {
    const type = btn.dataset.type;
    let count = 0;
    let baseText = '';

    switch(type) {
      case 'maradmin':
        count = getFilteredCount(allMaradmins);
        baseText = 'MARADMINs';
        break;
      case 'mcpub':
        count = getFilteredCount(allMcpubs);
        baseText = 'MCPUBs';
        break;
      case 'alnav':
        count = getFilteredCount(allAlnavs);
        baseText = 'ALNAVs';
        break;
      case 'almar':
        count = getFilteredCount(allAlmars);
        baseText = 'ALMARs';
        break;
      case 'semperadmin':
        count = getFilteredCount(allSemperAdminPosts);
        baseText = 'Semper Admin';
        break;
      case 'dodforms':
        count = getFilteredCount(allDodForms);
        baseText = 'DoD Forms';
        break;
      case 'fachecklists':
        count = getFilteredCount(allFaChecklists);
        baseText = 'FA Checklists';
        break;
      case 'youtube':
        count = getFilteredCount(allYouTubePosts);
        baseText = 'YouTube';
        break;
      case 'secnav':
        count = getFilteredCount(allSecnavs);
        baseText = 'SECNAV';
        break;
      case 'jtr':
        count = getFilteredCount(allJtrs);
        baseText = 'JTR';
        break;
      case 'dodfmr':
        count = getFilteredCount(allDodFmr);
        baseText = 'DoD FMR';
        break;
      case 'all':
        // Exclude ALNAV and SECNAV from All Messages count
        count = getFilteredCount([...allMaradmins, ...allMcpubs, ...allAlmars, ...allSemperAdminPosts, ...allDodForms, ...allFaChecklists, ...allYouTubePosts, ...allJtrs, ...allDodFmr]);
        baseText = 'All Messages';
        break;
    }

    // Update button text with counter badge
    btn.innerHTML = `${baseText} <span class="tab-counter">${count}</span>`;
  });
}

// Render summary statistics panel
function renderSummaryStats() {
  let totalCount = 0;
  if (currentMessageType === 'maradmin') {
    totalCount = allMaradmins.length;
  } else if (currentMessageType === 'mcpub') {
    totalCount = allMcpubs.length;
  } else if (currentMessageType === 'alnav') {
    totalCount = allAlnavs.length;
  } else if (currentMessageType === 'almar') {
    totalCount = allAlmars.length;
  } else if (currentMessageType === 'semperadmin') {
    totalCount = allSemperAdminPosts.length;
  } else if (currentMessageType === 'dodforms') {
    totalCount = allDodForms.length;
  } else if (currentMessageType === 'fachecklists') {
    totalCount = allFaChecklists.length;
  } else if (currentMessageType === 'youtube') {
    totalCount = allYouTubePosts.length;
  } else if (currentMessageType === 'secnav') {
    totalCount = allSecnavs.length;
  } else if (currentMessageType === 'jtr') {
    totalCount = allJtrs.length;
  } else if (currentMessageType === 'dodfmr') {
    totalCount = allDodFmr.length;
  } else if (currentMessageType === 'all') {
    // Exclude ALNAV and SECNAV from total count
    totalCount = allMaradmins.length + allMcpubs.length + allAlmars.length + allSemperAdminPosts.length + allDodForms.length + allFaChecklists.length + allYouTubePosts.length + allJtrs.length + allDodFmr.length;
  }

  // Get date range
  const dates = currentMessages.map(m => m.pubDateObj).sort((a, b) => a - b);
  const oldestDate = dates.length > 0 ? formatDate(dates[0]) : 'N/A';
  const newestDate = dates.length > 0 ? formatDate(dates[dates.length - 1]) : 'N/A';

  // Count by type if showing all (ALNAV and SECNAV excluded from All Messages)
  let typeBreakdown = '';
  if (currentMessageType === 'all') {
    const maradminCount = currentMessages.filter(m => m.type === 'maradmin').length;
    const mcpubCount = currentMessages.filter(m => m.type === 'mcpub').length;
    const almarCount = currentMessages.filter(m => m.type === 'almar').length;
    const semperAdminCount = currentMessages.filter(m => m.type === 'semperadmin').length;
    const dodFormsCount = currentMessages.filter(m => m.type === 'dodforms').length;
    const faChecklistsCount = currentMessages.filter(m => m.type === 'fachecklists').length;
    const youtubeCount = currentMessages.filter(m => m.type === 'youtube').length;
    const jtrCount = currentMessages.filter(m => m.type === 'jtr').length;
    const dodfmrCount = currentMessages.filter(m => m.type === 'dodfmr').length;
    typeBreakdown = `
      <div class="stat-item">
        <span class="stat-label">MARADMINs:</span>
        <span class="stat-value">${maradminCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">MCPUBs:</span>
        <span class="stat-value">${mcpubCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">ALMARs:</span>
        <span class="stat-value">${almarCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Semper Admin:</span>
        <span class="stat-value">${semperAdminCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">DoD Forms:</span>
        <span class="stat-value">${dodFormsCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">FA Checklists:</span>
        <span class="stat-value">${faChecklistsCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">YouTube:</span>
        <span class="stat-value">${youtubeCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">JTR:</span>
        <span class="stat-value">${jtrCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">DoD FMR:</span>
        <span class="stat-value">${dodfmrCount}</span>
      </div>
    `;
  }

  // Check if stats should be collapsed (from localStorage)
  const isCollapsed = localStorage.getItem('stats_collapsed') === 'true';

  summaryStatsDiv.innerHTML = `
    <div class="stats-header">
      <h3>Summary Overview</h3>
      <button class="stats-toggle-btn" onclick="toggleSummaryStats()">
        ${isCollapsed ? '▼' : '▲'}
      </button>
    </div>
    <div class="stats-grid ${isCollapsed ? 'collapsed' : ''}">
      <div class="stat-item">
        <span class="stat-label">Total Showing:</span>
        <span class="stat-value">${currentMessages.length} of ${totalCount}</span>
      </div>
      ${typeBreakdown}
      <div class="stat-item">
        <span class="stat-label">Date Range:</span>
        <span class="stat-value">${oldestDate} - ${newestDate}</span>
      </div>
    </div>
  `;
}

// Toggle summary stats collapse/expand
function toggleSummaryStats() {
  const statsGrid = summaryStatsDiv.querySelector('.stats-grid');
  const toggleBtn = summaryStatsDiv.querySelector('.stats-toggle-btn');

  if (statsGrid.classList.contains('collapsed')) {
    statsGrid.classList.remove('collapsed');
    toggleBtn.textContent = '▲';
    localStorage.setItem('stats_collapsed', 'false');
  } else {
    statsGrid.classList.add('collapsed');
    toggleBtn.textContent = '▼';
    localStorage.setItem('stats_collapsed', 'true');
  }
}

// Feature removed: Copy link to clipboard functionality has been removed per APPLICATION_CONFIG

// Utilities
function firstSentence(text) {
  if(!text) return "";
  const m = text.replace(/<[^>]*>/g,"").match(/^[^.!?]+[.!?]/);
  return m ? m[0] : text.substring(0,150)+"...";
}

function renderMaradmins(arr) {
  resultsDiv.innerHTML = "";

  // Always show summary stats
  renderSummaryStats();
  summaryStatsDiv.classList.remove('hidden');

  if (arr.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No messages found matching your criteria.</div>';
    return;
  }

  // Always render compact view
  renderCompactView(arr);
}

// Render compact list view
function renderCompactView(arr) {
  const container = document.createElement("div");
  container.className = "compact-view";

  // Add cards
  arr.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "compact-card";
    card.dataset.index = index;

    const typeLabels = {
      'maradmin': 'MARADMIN',
      'mcpub': 'MCPUB',
      'alnav': 'ALNAV',
      'almar': 'ALMAR',
      'semperadmin': 'SEMPER ADMIN',
      'dodforms': 'DOD FORM',
      'youtube': 'YOUTUBE',
      'secnav': 'SECNAV',
      'jtr': 'JTR',
      'dodfmr': 'DOD FMR'
    };
    const typeLabel = typeLabels[item.type] || item.type.toUpperCase();
    const typeBadge = `<span class="type-badge type-${item.type}">${typeLabel}</span>`;

    // Get configuration for this message type
    const config = APPLICATION_CONFIG.MESSAGE_TEMPLATES[item.type] || {
      subjectSource: 'subject',
      showAISummary: false,
      showDetails: true,
      prependIdToTitle: false,
      hideIdColumn: false
    };

    // Determine which field to display as subject
    let displaySubject = config.subjectSource === 'summary' ? (item.summary || item.subject) : item.subject;

    // Prepend ID to title if configured
    if (config.prependIdToTitle && item.id) {
      displaySubject = `${item.id}: ${displaySubject}`;
    }

    // Determine link URL (some types use semperadminLink)
    const linkUrl = config.linkSource === 'semperadminLink' && item.semperadminLink ? item.semperadminLink : item.link;

    // Check if message is from today
    const isNew = isMessageNew(item.pubDateObj);
    const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';

    // Build action buttons based on configuration
    let actionButtons = '';
    if (config.showAISummary) {
      actionButtons += `<button class="compact-ai-btn" onclick="toggleAISummary(${index}, currentMessages[${index}])" title="Generate AI Summary">🤖 AI Summary</button>`;
    } else {
      actionButtons = '<span class="no-actions">—</span>';
    }

    // Build ID column HTML (conditionally shown)
    const idColumnHtml = config.hideIdColumn ? '' : `
        <div class="compact-detail-col">
          <span class="compact-detail-label">ID</span>
          <div class="compact-detail-value">
            <span class="compact-id">${item.id}</span>
            ${newBadge}
          </div>
        </div>`;

    card.innerHTML = `
      <!-- Subject Header Row -->
      <div class="compact-card-header">
        <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="compact-subject">${displaySubject}</a>
        ${config.hideIdColumn ? newBadge : ''}
      </div>

      <!-- Details Grid -->
      <div class="compact-card-details">
        ${idColumnHtml}

        <div class="compact-detail-col">
          <span class="compact-detail-label">Date</span>
          <span class="compact-detail-value compact-date">${formatDate(item.pubDateObj)}</span>
        </div>

        <div class="compact-detail-col">
          <span class="compact-detail-label">Type</span>
          <div class="compact-detail-value">
            ${typeBadge}
          </div>
        </div>

        <div class="compact-detail-col compact-detail-col--action">
          <span class="compact-detail-label">Action</span>
          <div class="compact-detail-value">
            ${actionButtons}
          </div>
        </div>
      </div>
    `;

    // Add expandable details row
    const detailsRow = document.createElement("div");
    detailsRow.className = "compact-details-row";
    detailsRow.id = `compact-details-${index}`;
    detailsRow.style.display = "none";
    detailsRow.innerHTML = `
      <div class="compact-details-content">
        <div class="compact-actions">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="compact-link-btn">View Full Message →</a>
        </div>
      </div>
    `;

    container.appendChild(card);
    container.appendChild(detailsRow);
  });

  resultsDiv.appendChild(container);
}

// Toggle details in compact view
function toggleCompactDetails(index, message) {
  const detailsRow = document.getElementById(`compact-details-${index}`);
  const btn = event.target;
  const aiSummary = detailsRow.querySelector('.ai-summary-display');

  // Use CSS class to track state instead of checking textContent (more maintainable)
  const isExpanded = btn.classList.contains('details-expanded');

  // Don't close the details row if AI summary is showing - just hide/show the message details
  const summarySection = detailsRow.querySelector('.compact-summary');
  const descSection = detailsRow.querySelector('.compact-description');
  const categorySection = detailsRow.querySelector('.compact-category');
  const actionsSection = detailsRow.querySelector('.compact-actions');

  if (isExpanded) {
    // Hide message details but keep AI summary visible
    if (summarySection) summarySection.style.display = 'none';
    if (descSection) descSection.style.display = 'none';
    if (categorySection) categorySection.style.display = 'none';
    if (actionsSection) actionsSection.style.display = 'none';
    btn.textContent = '📋 Details';
    btn.classList.remove('details-expanded');
  } else {
    // Show message details
    detailsRow.style.display = 'block';
    if (summarySection) summarySection.style.display = 'block';
    if (descSection) descSection.style.display = 'block';
    if (categorySection) categorySection.style.display = 'block';
    if (actionsSection) actionsSection.style.display = 'block';
    btn.textContent = '📋 Hide Details';
    btn.classList.add('details-expanded');
  }
}

// Format AI summary text with enhanced HTML markup for 5W format
function formatAISummaryHTML(summary) {
  if (!summary) return '';

  const text = String(summary);
  const lines = text.split(/\r?\n/);
  const esc = (s) => escapeHtml(String(s || ''));

  // Title
  const titleMatch = text.match(/💰\s*(.*?)\s*💰/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  let html = '';
  if (title) html += `<h3 class="summary-title">${esc(title)}</h3>`;
  if (text.includes('---')) html += '<hr class="summary-divider">';

  // 5W table extraction
  let fiveW = { Who: '', What: '', When: '', Where: '', Why: '' };
  const hasTabTable = /5\sW'?s?\s*\t\s*Details/i.test(text) || /(Who\?|What\?|When\?|Where\?|Why\?)\s*\t/i.test(text);
  if (hasTabTable) {
    lines.forEach(l => {
      const m = l.match(/^(Who\?|What\?|When\?|Where\?|Why\?)\s*\t\s*(.*)$/i);
      if (m) {
        const key = m[1].replace('?','');
        const norm = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        fiveW[norm] = m[2].trim();
      }
    });
  } else {
    const whoM = text.match(/\*\s+\*\*WHO:\*\*\s*(.*)/i);
    const whatM = text.match(/\*\s+\*\*WHAT:\*\*\s*(.*)/i);
    const whenM = text.match(/\*\s+\*\*WHEN:\*\*\s*(.*)/i);
    const whereM = text.match(/\*\s+\*\*WHERE:\*\*\s*(.*)/i);
    const whyM = text.match(/\*\s+\*\*WHY:\*\*\s*(.*)/i);
    fiveW.Who = whoM ? whoM[1].trim() : fiveW.Who;
    fiveW.What = whatM ? whatM[1].trim() : fiveW.What;
    fiveW.When = whenM ? whenM[1].trim() : fiveW.When;
    fiveW.Where = whereM ? whereM[1].trim() : fiveW.Where;
    fiveW.Why = whyM ? whyM[1].trim() : fiveW.Why;
  }

  // Render 5W table
  html += '<h4 class="five-w-header">5 W\'s</h4>';
  html += '<table class="fivew-table"><thead><tr><th>5 W\'s</th><th>Details</th></tr></thead><tbody>';
  html += `<tr><td>Who?</td><td>${esc(fiveW.Who)}</td></tr>`;
  html += `<tr><td>What?</td><td>${esc(fiveW.What)}</td></tr>`;
  html += `<tr><td>When?</td><td>${esc(fiveW.When)}</td></tr>`;
  html += `<tr><td>Where?</td><td>${esc(fiveW.Where)}</td></tr>`;
  html += `<tr><td>Why?</td><td>${esc(fiveW.Why)}</td></tr>`;
  html += '</tbody></table>';

  // Key Points sections
  const keyHeader = text.match(/🎯\s*(?:\*\*\s*)?KEY POINTS[^\n]*/i);
  if (keyHeader) {
    html += '<h4 class="key-points-header">🎯 Key Points</h4>';

    let currentSection = '';
    let items = [];
    const flush = () => {
      if (!currentSection) return;
      html += `<h5 class="section-subheader">${esc(currentSection)}</h5>`;
      if (items.length) {
        html += '<ul class="key-points-list">';
        items.forEach(x => html += `<li>${esc(x)}</li>`);
        html += '</ul>';
      }
      currentSection = '';
      items = [];
    };

    const startIdx = lines.findIndex(l => l.includes(keyHeader[0]));
    for (let i = startIdx + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      const bullet = l.match(/^•\s*(.+)$/);
      const sect = l.match(/^(?:\*\*)?([A-Z][A-Z\s/&-]+?)(?:\*\*)?:\s*$/);
      const sect2 = !sect && l.match(/^([A-Z][A-Z\s/&-]+)$/);

      if (sect || sect2) {
        flush();
        currentSection = (sect ? sect[1] : sect2[1]).trim();
        continue;
      }
      if (bullet) { items.push(bullet[1]); continue; }
      if (currentSection) {
        if (items.length) {
          items[items.length - 1] += ' ' + l;
        } else {
          items.push(l);
        }
      }
    }
    flush();
  }

  // Optional note line
  const note = text.match(/_Note:.*$/m);
  if (note) {
    html += `<p class="summary-note">${esc(note[0].replace(/^_+|_+$/g,''))}</p>`;
  }

  return html;
}

// Toggle AI-generated summary (compact view only)
async function toggleAISummary(index, message) {
  const btn = event.target;
  const detailsRow = document.getElementById(`compact-details-${index}`);

  if (!detailsRow) return;

  const existingSummary = detailsRow.querySelector('.ai-summary-display');

  // If already exists, toggle visibility
  if (existingSummary) {
    if (existingSummary.style.display === 'none') {
      existingSummary.style.display = 'block';
      detailsRow.style.display = 'block';
      btn.textContent = '🤖 Hide Summary';
      btn.classList.add('active');
    } else {
      existingSummary.style.display = 'none';
      detailsRow.style.display = 'none';
      btn.textContent = '🤖 AI Summary';
      btn.classList.remove('active');
    }
    return;
  }

  // Generate new summary
  try {
    const messageKey = `${message.type}_${message.numericId}`;
    let summary = summaryCache[messageKey] || message.aiSummary;
    let isCached = !!summary;

    if (!summary) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Generating...';
      btn.classList.add('loading');

      summary = await generateAISummary(message, btn);

      btn.disabled = false;
      btn.classList.remove('loading');
    }

    // Show the details row
    detailsRow.style.display = 'block';

    // Add summary to details row - properly escape HTML
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'ai-summary-display';

    const header = document.createElement('div');
    header.className = 'ai-summary-header';
    const cacheIndicator = isCached ? '<span class="cache-indicator" title="Loaded from cache">⚡ Cached</span>' : '<span class="cache-indicator new" title="Newly generated">✨ New</span>';
    header.innerHTML = `<span class="ai-summary-title">🤖 AI-Generated Summary</span>${cacheIndicator}`;

  const textDiv = document.createElement('div');
  textDiv.className = 'ai-summary-text';
  // Format summary with enhanced HTML markup
  textDiv.innerHTML = formatAISummaryHTML(summary);

    summaryDiv.appendChild(header);
    summaryDiv.appendChild(textDiv);

    const content = detailsRow.querySelector('.compact-details-content');
    const summarySection = detailsRow.querySelector('.compact-summary');
    if (summarySection) {
      content.insertBefore(summaryDiv, summarySection);
    } else {
      content.appendChild(summaryDiv);
    }

    btn.textContent = '🤖 Hide Summary';
    btn.classList.add('active');

  } catch (error) {
    console.error('Error displaying AI summary:', error);
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = '❌ Retry';

    // Show user-friendly error message
    const errorMsg = error.message.includes('Proxy server not configured')
      ? 'AI Summary requires server configuration. Please contact administrator.'
      : 'Failed to generate summary. Please try again.';

    showError('AI Summary Error', errorMsg, 'error');
  }
}

// Escape HTML to prevent code injection and display issues
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toggle message details
async function toggleDetails(index, message) {
  const detailsDiv = document.getElementById(`details-${index}`);
  const btn = event.target;

  // If already visible, hide it
  if (detailsDiv.style.display === 'block') {
    detailsDiv.style.display = 'none';
    btn.textContent = '📄 Show Details';
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

      // Display details based on message type
      if (message.type === 'maradmin') {
        // Display MARADMIN details
        detailsDiv.innerHTML = `
          <div class="maradmin-details-content">
            <h4>Message Details</h4>
            ${message.maradminNumber ? `<p class="maradmin-number-found">📄 MARADMIN Number: <strong>${message.maradminNumber}</strong></p>` : '<p class="no-details-found">No additional details extracted.</p>'}
          </div>
        `;
      } else if (message.type === 'mcpub') {
        // Display PDF download and info for MCPUBs
        detailsDiv.innerHTML = `
          <div class="mcpub-details">
            <h4>Publication Details</h4>
            ${message.pdfUrl ? `
              <div class="pdf-download">
                <a href="${message.pdfUrl}" target="_blank" rel="noopener noreferrer" class="download-pdf-btn">
                  📥 Download PDF
                </a>
                <p class="pdf-link-url">${message.id || 'PDF Document'}</p>
              </div>
            ` : ''}
            ${message.mcpubInfo && message.mcpubInfo.subject ? `
              <div class="mcpub-info">
                <strong>Subject:</strong> ${message.mcpubInfo.subject}
              </div>
            ` : ''}
            ${message.mcpubInfo && message.mcpubInfo.effectiveDate ? `
              <div class="mcpub-info">
                <strong>Effective Date:</strong> ${message.mcpubInfo.effectiveDate}
              </div>
            ` : ''}
            ${!message.pdfUrl ? '<p class="no-pdf-found">No PDF download link found on this page.</p>' : ''}
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

    if (message.type === 'maradmin') {
      detailsDiv.innerHTML = `
        <div class="maradmin-details-content">
          <h4>Message Details</h4>
          ${message.maradminNumber ? `<p class="maradmin-number-found">📄 MARADMIN Number: <strong>${message.maradminNumber}</strong></p>` : '<p class="no-details-found">No additional details extracted.</p>'}
        </div>
      `;
    } else if (message.type === 'mcpub') {
      detailsDiv.innerHTML = `
        <div class="mcpub-details">
          <h4>Publication Details</h4>
          ${message.pdfUrl ? `
            <div class="pdf-download">
              <a href="${message.pdfUrl}" target="_blank" rel="noopener noreferrer" class="download-pdf-btn">
                📥 Download PDF
              </a>
              <p class="pdf-link-url">${message.id || 'PDF Document'}</p>
            </div>
          ` : ''}
          ${message.mcpubInfo && message.mcpubInfo.subject ? `
            <div class="mcpub-info">
              <strong>Subject:</strong> ${message.mcpubInfo.subject}
            </div>
          ` : ''}
          ${message.mcpubInfo && message.mcpubInfo.effectiveDate ? `
            <div class="mcpub-info">
              <strong>Effective Date:</strong> ${message.mcpubInfo.effectiveDate}
            </div>
          ` : ''}
          ${!message.pdfUrl ? '<p class="no-pdf-found">No PDF download link found on this page.</p>' : ''}
        </div>
      `;
    }
  }
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Check if message is from today
function isMessageNew(pubDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDate = new Date(pubDate);
  messageDate.setHours(0, 0, 0, 0);
  return messageDate.getTime() === today.getTime();
}

/**
 * Show error message to user with detailed information
 * @param {string} msg - Main error message
 * @param {string} details - Additional details (optional)
 * @param {string} type - Error type: 'error', 'warning', 'info'
 */
function showError(msg, details = null, type = 'error') {
  let fullMessage = msg;
  if (details) {
    fullMessage += `<br><small>${details}</small>`;
  }

  errorDiv.innerHTML = fullMessage;
  errorDiv.classList.remove("hidden");
  errorDiv.className = `error-message ${type}`;

  // Auto-hide based on severity (and if we have cached data)
  const hasData = allMaradmins.length > 0 || allMcpubs.length > 0;
  if (hasData) {
    const hideDelay = type === 'info' ? 5000 : type === 'warning' ? 10000 : 15000;
    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, hideDelay);
  }
}

/**
 * Retry a fetch operation with exponential backoff
 * @param {Function} fetchFn - Function that returns a Promise
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise} Result of the fetch operation
 */
async function retryWithBackoff(fetchFn, maxRetries = 3, operationName = 'operation') {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s delay
        console.log(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function cacheData() {
  try {
    localStorage.setItem("maradmin_cache", JSON.stringify(allMaradmins));
    localStorage.setItem("mcpub_cache", JSON.stringify(allMcpubs));
    localStorage.setItem("alnav_cache", JSON.stringify(allAlnavs));
    localStorage.setItem("almar_cache", JSON.stringify(allAlmars));
    localStorage.setItem("semperadmin_cache", JSON.stringify(allSemperAdminPosts));
    localStorage.setItem("dodforms_cache", JSON.stringify(allDodForms));
    localStorage.setItem("youtube_cache", JSON.stringify(allYouTubePosts));
    localStorage.setItem("secnav_cache", JSON.stringify(allSecnavs));
    localStorage.setItem("jtr_cache", JSON.stringify(allJtrs));
    localStorage.setItem("dodfmr_cache", JSON.stringify(allDodFmr));
    localStorage.setItem("summary_cache", JSON.stringify(summaryCache));
    localStorage.setItem("cache_timestamp", new Date().toISOString());
  } catch(e) {
    console.error("Failed to cache data:", e);
  }
}

function loadCachedData() {
  try {
    const maradminCache = localStorage.getItem("maradmin_cache");
    const mcpubCache = localStorage.getItem("mcpub_cache");
    const alnavCache = localStorage.getItem("alnav_cache");
    const almarCache = localStorage.getItem("almar_cache");
    const semperAdminCache = localStorage.getItem("semperadmin_cache");
    const summaryCacheData = localStorage.getItem("summary_cache");
    const ts = localStorage.getItem("cache_timestamp");

    if (maradminCache) {
      allMaradmins = JSON.parse(maradminCache);
      allMaradmins = allMaradmins.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    if (mcpubCache) {
      allMcpubs = JSON.parse(mcpubCache);
      allMcpubs = allMcpubs.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    if (alnavCache) {
      allAlnavs = JSON.parse(alnavCache);
      allAlnavs = allAlnavs.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    if (almarCache) {
      allAlmars = JSON.parse(almarCache);
      allAlmars = allAlmars.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    if (semperAdminCache) {
      allSemperAdminPosts = JSON.parse(semperAdminCache);
      allSemperAdminPosts = allSemperAdminPosts.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    const dodFormsCache = localStorage.getItem("dodforms_cache");
    if (dodFormsCache) {
      allDodForms = JSON.parse(dodFormsCache);
      allDodForms = allDodForms.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    const youtubeCache = localStorage.getItem("youtube_cache");
    if (youtubeCache) {
      allYouTubePosts = JSON.parse(youtubeCache);
      allYouTubePosts = allYouTubePosts.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    const secnavCache = localStorage.getItem("secnav_cache");
    if (secnavCache) {
      allSecnavs = JSON.parse(secnavCache);
      allSecnavs = allSecnavs.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    const jtrCache = localStorage.getItem("jtr_cache");
    if (jtrCache) {
      allJtrs = JSON.parse(jtrCache);
      allJtrs = allJtrs.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    const dodfmrCache = localStorage.getItem("dodfmr_cache");
    if (dodfmrCache) {
      allDodFmr = JSON.parse(dodfmrCache);
      allDodFmr = allDodFmr.map(m => ({
        ...m,
        pubDateObj: new Date(m.pubDate)
      }));
    }

    if (summaryCacheData) {
      summaryCache = JSON.parse(summaryCacheData);
    }

    if (ts) {
      lastUpdateSpan.textContent = new Date(ts).toLocaleString();
    }

    filterMessages();
  } catch(e) {
    console.error("Failed to load cached data:", e);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");

  // If no saved preference, check system preference
  if (!savedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add("dark-theme");
      themeToggle.textContent = "☀️ Light Mode";
      localStorage.setItem("theme", "dark");
      return;
    }
  }

  // Use saved preference
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeToggle.textContent = "☀️ Light Mode";
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-update if user hasn't manually set a preference
    const userPreference = localStorage.getItem("theme");
    if (!userPreference) {
      if (e.matches) {
        document.body.classList.add("dark-theme");
        themeToggle.textContent = "☀️ Light Mode";
      } else {
        document.body.classList.remove("dark-theme");
        themeToggle.textContent = "🌙 Dark Mode";
      }
    }
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function updateLastUpdate() {
  lastUpdateSpan.textContent = new Date().toLocaleString();
}

// Initialize shrink-on-scroll behavior: header stays visible and compacts when scrolled
function initStickyHeader() {
  const header = document.querySelector('header');
  if (!header) return;

  // Create a spacer to preserve layout when header is fixed
  let headerSpacer = document.getElementById('headerSpacer');
  if (!headerSpacer) {
    headerSpacer = document.createElement('div');
    headerSpacer.id = 'headerSpacer';
    header.parentNode.insertBefore(headerSpacer, header.nextSibling);
  }

  const setSpacerHeight = () => {
    const rect = header.getBoundingClientRect();
    headerSpacer.style.height = `${rect.height}px`;
  };

  const applyShrink = () => {
    const isScrolled = window.scrollY > 0;
    header.classList.toggle('scrolled', isScrolled);
    // After style changes, keep spacer height in sync
    // Measure immediately, next frame, and after transitions complete
    setSpacerHeight();
    window.requestAnimationFrame(setSpacerHeight);
    setTimeout(setSpacerHeight, 250);
  };

  // Initial state
  setSpacerHeight();
  applyShrink();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        applyShrink();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Keep spacer responsive
  window.addEventListener('resize', () => {
    setSpacerHeight();
  });

  // Observe header size changes (e.g., due to child transitions)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => setSpacerHeight());
    ro.observe(header);
  } else {
    // Fallback: listen for transitionend bubbling from child elements
    header.addEventListener('transitionend', setSpacerHeight, { passive: true });
  }
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      // Allow ESC to blur input fields
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    // Keyboard shortcuts
    switch(e.key.toLowerCase()) {
      case 'r':
        // R = Refresh
        e.preventDefault();
        refreshBtn.click();
        break;

      case 't':
        // T = Toggle theme
        e.preventDefault();
        toggleTheme();
        break;

      case 'f':
      case '/':
        // F or / = Focus search
        e.preventDefault();
        searchInput.focus();
        break;

      case 'p':
        // P = Print (only with Ctrl/Cmd)
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          window.print();
        }
        break;

      case '1':
        // 1 = MARADMINs tab
        e.preventDefault();
        switchMessageType('maradmin');
        break;

      case '2':
        // 2 = MCPUBs tab
        e.preventDefault();
        switchMessageType('mcpub');
        break;

      case '3':
        // 3 = ALNAVs tab
        e.preventDefault();
        switchMessageType('alnav');
        break;

      case '4':
        // 4 = ALMARs tab
        e.preventDefault();
        switchMessageType('almar');
        break;

      case '5':
        // 5 = Semper Admin tab
        e.preventDefault();
        switchMessageType('semperadmin');
        break;

      case '6':
        // 6 = DoD Forms tab
        e.preventDefault();
        switchMessageType('dodforms');
        break;

      case '7':
        // 7 = YouTube tab
        e.preventDefault();
        switchMessageType('youtube');
        break;

      case '8':
        // 8 = All Messages tab
        e.preventDefault();
        switchMessageType('all');
        break;

      case '?':
        // ? = Show keyboard shortcuts help
        if (e.shiftKey) {
          e.preventDefault();
          showKeyboardShortcuts();
        }
        break;
    }
  });
}

// Show keyboard shortcuts modal
function showKeyboardShortcuts() {
  const shortcuts = `
    KEYBOARD SHORTCUTS

    r         - Refresh messages
    t         - Toggle dark/light theme
    f or /    - Focus search box
    Ctrl+P    - Print current view
    1-8       - Switch between tabs
    Esc       - Clear search focus
    ?         - Show this help
  `;
  alert(shortcuts);
}

// ====================================
// FEEDBACK WIDGET
// ====================================

// Get feedback widget elements
const feedbackBtn = document.getElementById('feedbackBtn');
const feedbackModal = document.getElementById('feedbackModal');
const closeFeedbackModal = document.getElementById('closeFeedbackModal');
const cancelFeedback = document.getElementById('cancelFeedback');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackStatus = document.getElementById('feedbackStatus');

// Open feedback modal
feedbackBtn.addEventListener('click', () => {
  feedbackModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
});

// Close feedback modal
function closeFeedbackModalFunc() {
  feedbackModal.classList.add('hidden');
  document.body.style.overflow = ''; // Restore scrolling
  feedbackForm.reset();
  feedbackStatus.classList.add('hidden');
  feedbackStatus.classList.remove('success', 'error');
}

closeFeedbackModal.addEventListener('click', closeFeedbackModalFunc);
cancelFeedback.addEventListener('click', closeFeedbackModalFunc);

// Close modal when clicking outside
feedbackModal.addEventListener('click', (e) => {
  if (e.target === feedbackModal) {
    closeFeedbackModalFunc();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !feedbackModal.classList.contains('hidden')) {
    closeFeedbackModalFunc();
  }
});

// Handle feedback form submission
feedbackForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitButton = feedbackForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;

  // Get form values
  const feedbackType = document.getElementById('feedbackType').value;
  const feedbackTitle = document.getElementById('feedbackTitle').value;
  const feedbackDescription = document.getElementById('feedbackDescription').value;
  const feedbackEmail = document.getElementById('feedbackEmail').value;

  // Validate
  if (!feedbackType || !feedbackTitle.trim() || !feedbackDescription.trim()) {
    showFeedbackStatus('Please fill in all required fields.', 'error');
    return;
  }

  // Capture context
  const context = captureUserContext();

  // Disable submit button
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';
  feedbackStatus.classList.add('hidden');

  try {
    // Send to backend
    const response = await fetch(`${CUSTOM_PROXY_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: feedbackType,
        title: feedbackTitle,
        description: feedbackDescription,
        email: feedbackEmail,
        context: context
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showFeedbackStatus('Thank you! Your feedback has been submitted.', 'success', data.issueUrl);

      // Reset form after 2 seconds
      setTimeout(() => {
        closeFeedbackModalFunc();
      }, 3000);
    } else {
      throw new Error(data.error || 'Failed to submit feedback');
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
    showFeedbackStatus(`Error submitting feedback: ${error.message}. Please try again or report this issue on GitHub.`, 'error');
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// Show feedback status message (XSS-safe implementation)
function showFeedbackStatus(message, type, issueUrl = null) {
  // Clear previous content safely
  feedbackStatus.textContent = '';
  feedbackStatus.classList.remove('hidden', 'success', 'error');
  feedbackStatus.classList.add(type);

  // Add text content safely
  const textNode = document.createTextNode(message);
  feedbackStatus.appendChild(textNode);

  // If there's an issue URL, add it as a proper link element
  if (issueUrl) {
    feedbackStatus.appendChild(document.createTextNode(' '));
    const link = document.createElement('a');
    link.href = issueUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer'; // Security best practice
    link.style.cssText = 'color: inherit; text-decoration: underline;';
    link.textContent = 'View issue';
    feedbackStatus.appendChild(link);
  }
}

// Capture user context for feedback
function captureUserContext() {
  const currentFilter = document.querySelector('.message-type-btn.active');
  const currentDateRange = dateRangeSelect.value;
  const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

  return {
    browser: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    currentTab: currentFilter ? currentFilter.dataset.type : 'unknown',
    dateFilter: currentDateRange,
    theme: theme,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
}
