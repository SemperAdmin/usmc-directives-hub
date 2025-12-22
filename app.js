// APPLICATION_CONFIG: UI, layout, and message-type rendering rules
const APPLICATION_CONFIG = {
  MESSAGE_TEMPLATES: {
    maradmin: { subjectSource: 'subject', showAISummary: true, showDetails: true, prependIdToTitle: true, hideIdColumn: true },
    mcpub: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    almar: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    dodforms: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: true, hideIdColumn: true },
    dodfmr: { subjectSource: 'subject', showAISummary: false, showDetails: false, prependIdToTitle: false, hideIdColumn: true },
    igmc: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    youtube: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    alnav: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    secnav: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: false },
    jtr: { subjectSource: 'subject', showAISummary: false, showDetails: true, prependIdToTitle: false, hideIdColumn: true }
  }
};

// ============================================================================
// ERROR ANALYTICS SYSTEM
// Centralized error tracking for debugging and monitoring
// ============================================================================
const ErrorAnalytics = {
  errors: [],
  MAX_ERRORS: 100, // Keep last 100 errors in memory

  /**
   * Track an error with context
   * @param {string} source - Where the error occurred (e.g., 'fetchFeed', 'parseRSS')
   * @param {Error|string} error - The error object or message
   * @param {object} context - Additional context (url, type, etc.)
   */
  track(source, error, context = {}) {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      source,
      message: error?.message ?? (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error)),
      stack: error?.stack ?? null,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to beginning of array (newest first)
    this.errors.unshift(errorEntry);

    // Keep only last MAX_ERRORS
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(0, this.MAX_ERRORS);
    }

    // Log structured error
    console.error(`[ErrorAnalytics] ${source}:`, {
      message: errorEntry.message,
      context: errorEntry.context,
      timestamp: errorEntry.timestamp
    });

    return errorEntry;
  },

  /**
   * Get recent errors, optionally filtered by source
   * @param {string} source - Filter by source (optional)
   * @param {number} limit - Max errors to return (default 10)
   */
  getRecent(source = null, limit = 10) {
    let filtered = this.errors;
    if (source) {
      filtered = filtered.filter(e => e.source === source);
    }
    return filtered.slice(0, limit);
  },

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      total: this.errors.length,
      bySource: {},
      last24h: 0,
      lastHour: 0
    };

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);

    this.errors.forEach(err => {
      // Count by source
      stats.bySource[err.source] = (stats.bySource[err.source] || 0) + 1;

      // Count by time
      const errorTime = new Date(err.timestamp).getTime();
      if (errorTime > hourAgo) stats.lastHour++;
      if (errorTime > dayAgo) stats.last24h++;
    });

    return stats;
  },

  /**
   * Clear all tracked errors
   */
  clear() {
    const count = this.errors.length;
    this.errors = [];
    console.log(`[ErrorAnalytics] Cleared ${count} errors`);
    return count;
  },

  /**
   * Export errors for debugging/reporting
   */
  export() {
    return {
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.errors
    };
  }
};

// Make ErrorAnalytics available globally for debugging
window.ErrorAnalytics = ErrorAnalytics;

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  ErrorAnalytics.track('uncaught', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  ErrorAnalytics.track('unhandledRejection', event.reason, {
    type: 'promise'
  });
});

console.log('[ErrorAnalytics] Initialized - use window.ErrorAnalytics.getStats() to view error statistics');

// RSS Feed URLs
const RSS_FEEDS = {
  maradmin: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=500&category=14336",
  mcpub: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=5&Site=481&max=500",
  almar: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=500&category=14335",
  alnav: null, // Using static data file loaded from lib/alnav-data.js
  secnav: null, // Using static data file loaded from lib/secnav-data.js
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

// SECNAV URLs - Now using static data file (loaded from lib/secnav-data.js)
// This function is deprecated but kept for compatibility
function getSecnavUrls() {
  return [];
}

// DoD FMR URLs - Department of Defense Financial Management Regulation
function getDodFmrUrls() {
  // DoD FMR change pages
  return ['https://comptroller.defense.gov/FMR/change/'];
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

// Proxy preference caching to reduce load times
const PROXY_CACHE_KEY = 'preferred_cors_proxy';
const PROXY_CACHE_TIMESTAMP_KEY = 'proxy_cache_timestamp';
const PROXY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save successful proxy to cache
 * @param {string} proxyUrl - The proxy URL that worked
 */
function savePreferredProxy(proxyUrl) {
  try {
    localStorage.setItem(PROXY_CACHE_KEY, proxyUrl);
    localStorage.setItem(PROXY_CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log(`[Proxy Cache] Saved preferred proxy: ${proxyUrl}`);
  } catch (e) {
    console.warn('[Proxy Cache] Failed to save proxy preference:', e);
  }
}

/**
 * Get preferred proxy from cache if still valid
 * @returns {string|null} The cached proxy URL or null if expired/not found
 */
function getPreferredProxy() {
  try {
    const proxy = localStorage.getItem(PROXY_CACHE_KEY);
    const timestamp = localStorage.getItem(PROXY_CACHE_TIMESTAMP_KEY);

    if (!proxy || !timestamp) {return null;}

    const age = Date.now() - parseInt(timestamp);
    if (age > PROXY_CACHE_MAX_AGE) {
      // Cache expired
      localStorage.removeItem(PROXY_CACHE_KEY);
      localStorage.removeItem(PROXY_CACHE_TIMESTAMP_KEY);
      console.log('[Proxy Cache] Cache expired, will try all proxies');
      return null;
    }

    console.log(`[Proxy Cache] Using cached proxy (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return proxy;
  } catch (e) {
    console.warn('[Proxy Cache] Failed to get proxy preference:', e);
    return null;
  }
}

/**
 * Get ordered list of proxies with preferred one first
 * @returns {Array<string>} Ordered array of proxy URLs
 */
function getOrderedProxies() {
  const preferred = getPreferredProxy();
  if (!preferred) {return CORS_PROXIES;}

  // Put preferred proxy first, followed by others
  return [
    preferred,
    ...CORS_PROXIES.filter(p => p !== preferred)
  ];
}

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
let allDodForms = []; // Store all DoD Forms
let allIgmcChecklists = []; // Store all IGMC Checklists
let allYouTubePosts = []; // Store all YouTube posts
let allSecnavs = []; // Store all SECNAV directives
let allJtrs = []; // Store all JTR (Joint Travel Regulations) updates
let allDodFmr = []; // Store all DoD FMR changes
let currentMessageType = 'maradmin'; // Track current view: 'maradmin', 'mcpub', 'alnav', 'almar', 'dodforms', 'igmc', 'youtube', 'secnav', 'jtr', 'dodfmr', or 'all'
let summaryCache = {}; // Cache for AI-generated summaries

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadCachedData();
  loadIgmcChecklists(); // Load IGMC Checklists from static data file
  loadSecnavDirectives(); // Load SECNAV Directives from static data file (lib/secnav-data.js)
  loadAlnavMessages(); // Load ALNAV Messages from static data file (lib/alnav-data.js)
  // Note: Static files may be empty if fetch scripts failed during build
  // This is expected in GitHub Actions due to network restrictions
  restoreFilterPreferences();
  fetchAllFeeds();
  initTheme();
  startAutoRefresh();
  initStickyHeader();
  initKeyboardShortcuts();
});
refreshBtn.addEventListener("click", () => {
  // Warn user about API quota consumption before refreshing
  const confirmed = confirm(
    '⚠️ Manual Refresh Warning\n\n' +
    'This will fetch fresh data from all sources and use API quota.\n\n' +
    '• YouTube API: Uses limited daily quota\n' +
    '• Most data is cached for 1-24 hours\n' +
    '• Auto-refresh runs every 10 minutes\n\n' +
    'Are you sure you want to refresh now?'
  );

  if (!confirmed) {
    return; // User cancelled
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = "🔄 Refreshing...";
  loadIgmcChecklists(); // Reload IGMC Checklists from static data file
  loadSecnavDirectives(); // Reload SECNAV Directives from static data file
  loadAlnavMessages(); // Reload ALNAV Messages from static data file
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

  // Skip if URL is null (using static data file instead)
  if (!url) {
    console.log(`⏭️  Skipping ${type.toUpperCase()} RSS fetch - using static data file`);
    return;
  }

  // Try custom proxy server first if configured (most reliable)
  if (CUSTOM_PROXY_URL) {
    try {
      const proxyUrl = `${CUSTOM_PROXY_URL}/api/proxy?url=${encodeURIComponent(url)}`;
      console.log(`Trying custom proxy for ${type}...`);

      // Retry logic for when proxy is spinning up (Render free tier)
      const retries = 3;
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

  // Try each fallback CORS proxy (with preferred proxy first)
  const orderedProxies = getOrderedProxies();
  for (let i = 0; i < orderedProxies.length; i++) {
    try {
      const proxyUrl = orderedProxies[i];
      statusDiv.textContent = `Fetching ${type.toUpperCase()}s... (attempt ${i + 1}/${orderedProxies.length})`;
      const text = await tryProxyFetch(proxyUrl, url);
      if (text) {
        // Save successful proxy for future use
        savePreferredProxy(proxyUrl);
        processRSSData(text, type);
        return;
      }
    } catch(err) {
      console.log(`Proxy ${i + 1} failed for ${type}:`, err.message);
      if (i === orderedProxies.length - 1) {
        // Last proxy failed - log error for all feed types
        console.error(`[${type.toUpperCase()}] All fetch methods failed`);

        // Show error for critical feed types
        const messageArrays = {
          maradmin: allMaradmins,
          mcpub: allMcpubs,
          jtr: allJtrs,
          almar: allAlmars
        };
        const messages = messageArrays[type] || [];
        if (messages.length === 0 && (type === 'maradmin' || type === 'mcpub')) {
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
  if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
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

  if (!response.ok) {throw new Error(`HTTP ${response.status}`);}

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
    ErrorAnalytics.track('fetchDodForms', error, { source: 'DoD Forms' });
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
          if (text) {break;}
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
      if (cells.length < 5) {return;}

      const linkElem = row.querySelector('a');
      const number = cells[0]?.textContent.trim() || '';
      const title = cells[1]?.textContent.trim() || '';
      const edition = cells[2]?.textContent.trim() || '';
      const controlled = cells[3]?.textContent.trim() || '';
      const opr = cells[4]?.textContent.trim() || '';

      if (!number) {return;}

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
          if (text) {break;}
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
      const alnavMatch = title.match(/ALNAV[_\s-]*(\d{3})[/-](\d{2,4})/i) ||
                         href.match(/ALNAV[_\s-]*(\d{3})[/-](\d{2,4})/i) ||
                         title.match(/(\d{3})[/-](\d{2,4})/) ||
                         href.match(/(\d{3})[/-](\d{2,4})/);

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

// Helper function to transform YouTube video data into standard message format
function transformYouTubeVideo(video) {
  // Handle both static data format and API response format
  const videoId = video.id?.videoId || video.id;
  const snippet = video.snippet || video;
  const pubDateObj = new Date(snippet.publishedAt);

  return {
    id: videoId,
    numericId: videoId,
    subject: snippet.title,
    title: snippet.title,
    link: `https://www.youtube.com/watch?v=${videoId}`,
    pubDate: pubDateObj.toISOString(),
    pubDateObj: pubDateObj,
    summary: (snippet.description || '').substring(0, 200),
    description: snippet.description || '',
    category: '',
    type: 'youtube',
    searchText: `${videoId} ${snippet.title} ${snippet.description || ''}`.toLowerCase(),
    detailsFetched: false,
    maradminNumber: null
  };
}

// Fetch YouTube videos using YouTube Data API v3
async function fetchYouTubeVideos() {
  console.log('Fetching YouTube videos...');

  try {
    // PRIORITY 1: Check if static YouTube data exists (loaded from lib/youtube-data.js)
    // This prevents API quota usage - data is pre-fetched daily by GitHub Actions
    if (window.YOUTUBE_VIDEOS?.length > 0) {
      console.log(`✓ Using pre-fetched YouTube data (${window.YOUTUBE_VIDEOS.length} videos, ZERO quota used)`);

      // Transform static data to match expected format
      const videos = window.YOUTUBE_VIDEOS.map(transformYouTubeVideo);

      allYouTubePosts = videos;
      cacheData();
      localStorage.setItem("youtube_cache_timestamp", new Date().toISOString());
      console.log(`Total YouTube videos loaded: ${allYouTubePosts.length} (from static data)`);
      return;
    }

    // PRIORITY 2: Fallback to API if static data not available
    console.log('⚠️  No pre-fetched data found, falling back to YouTube API (uses quota)');
    const videos = [];
    let pageToken = '';
    let pageCount = 0;
    const maxPages = 5; // Limit to 5 pages (250 videos max) - Reduced to conserve quota

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
              videos.push(transformYouTubeVideo(item));
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
        ErrorAnalytics.track('fetchYouTubePage', pageError, { pageCount, source: 'YouTube API' });
        break;
      }
    } while (pageToken && pageCount < maxPages);

    allYouTubePosts = videos;
    cacheData();
    localStorage.setItem("youtube_cache_timestamp", new Date().toISOString());
    console.log(`Total YouTube videos loaded: ${allYouTubePosts.length}`);
  } catch (error) {
    ErrorAnalytics.track('fetchYouTubeVideos', error, { source: 'YouTube' });
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

      if (!title || !href) {return;}

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

// Generic static data loader (reduces duplication across IGMC, SECNAV, ALNAV)
function loadStaticData(config) {
  const { dataKey, metaKey, typeName } = config;
  const typeUpper = typeName.toUpperCase();

  console.log(`Loading ${typeUpper} from static data file...`);

  try {
    // Check if data is available
    const data = window[dataKey];
    if (typeof data === 'undefined' || !Array.isArray(data)) {
      console.warn(`${dataKey} data not found or invalid`);
      return [];
    }

    console.log(`Found ${data.length} ${typeUpper} in static data`);

    // Transform data into message format
    const transformed = data.map(item => {
      // Parse publication date
      let pubDateObj = new Date();
      if (item.pubDate) {
        try {
          pubDateObj = new Date(item.pubDate);
          if (isNaN(pubDateObj.getTime())) {
            pubDateObj = new Date();
          }
        } catch (e) {
          console.warn(`Could not parse date: ${item.pubDate}`);
        }
      }

      return {
        id: item.id,
        subject: item.subject || item.title,
        link: item.link,
        pubDate: pubDateObj.toISOString(),
        pubDateObj: pubDateObj,
        type: typeName,
        description: item.description || '',
        searchText: `${item.id} ${item.title} ${item.subject || ''} ${item.description || ''}`.toLowerCase()
      };
    });

    // Sort by publication date descending (newest first)
    transformed.sort((a, b) => b.pubDateObj - a.pubDateObj);

    console.log(`Loaded ${transformed.length} ${typeUpper}`);

    // Log metadata if available
    const meta = window[metaKey];
    if (meta) {
      console.log(`[${typeUpper}] Source:`, meta.sourceUrl);
      console.log(`[${typeUpper}] Generated:`, meta.generatedAt);
    }

    return transformed;
  } catch (error) {
    console.error(`Error loading ${typeUpper}:`, error);
    return [];
  }
}

// Load IGMC Checklists from static data file
function loadIgmcChecklists() {
  console.log('Loading IGMC Checklists from static data file...');

  try {
    // Check if FA_CHECKLISTS data is available (loaded from lib/fa-checklists.js)
    if (typeof window.FA_CHECKLISTS === 'undefined' || !Array.isArray(window.FA_CHECKLISTS)) {
      console.warn('FA_CHECKLISTS data not found or invalid');
      allIgmcChecklists = [];
      return;
    }

    const checklists = window.FA_CHECKLISTS;
    console.log(`Found ${checklists.length} IGMC Checklists in static data`);

    // Transform IGMC Checklists data into message format
    allIgmcChecklists = checklists.map(checklist => {
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
        type: 'igmc',
        description: description,
        searchText: `${checklist.faNumber} ${checklist.functionalArea} ${checklist.category} ${checklist.sponsor}`.toLowerCase(),
        // Include original checklist data for reference
        igmcChecklist: checklist
      };
    });

    // Sort by effective date descending (newest first)
    allIgmcChecklists.sort((a, b) => {
      return b.pubDateObj - a.pubDateObj;
    });

    console.log(`Loaded ${allIgmcChecklists.length} IGMC Checklists`);

    // Log metadata if available
    if (window.FA_CHECKLISTS_META) {
      console.log('[IGMC] Source:', window.FA_CHECKLISTS_META.sourceUrl);
      console.log('[IGMC] Generated:', window.FA_CHECKLISTS_META.generatedAt);
    }
  } catch (error) {
    console.error('Error loading IGMC Checklists:', error);
    allIgmcChecklists = [];
  }
}

// Load SECNAV Directives from static data file
function loadSecnavDirectives() {
  allSecnavs = loadStaticData({
    dataKey: 'SECNAV_DIRECTIVES',
    metaKey: 'SECNAV_META',
    typeName: 'secnav'
  });
}

// Load ALNAV Messages from static data file
function loadAlnavMessages() {
  allAlnavs = loadStaticData({
    dataKey: 'ALNAV_MESSAGES',
    metaKey: 'ALNAV_META',
    typeName: 'alnav'
  });
}

// Fetch full message details from the message page
async function fetchMessageDetails(message) {
  if (message.detailsFetched) {return message;}

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
            } catch(e) {
              // Ignore JSON parse errors, keep original html
            }
          }
          break;
        }
      } catch(e) {
        console.log(`Failed to fetch via ${proxy}:`, e.message);
      }
    }

    if (!html) {throw new Error('All proxies failed');}

    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyText = doc.body?.textContent || '';

    if (message.type === 'maradmin') {
      // Extract MARADMIN number from content
      const maradminMatch = bodyText.match(/MARADMIN\s+(?:NUMBER\s+)?(\d+[/-]\d+)/i);

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
            // Update summary cache timestamp
            localStorage.setItem("summary_cache_timestamp", new Date().toISOString());
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

    // Update summary cache timestamp (24-hour TTL)
    localStorage.setItem("summary_cache_timestamp", new Date().toISOString());

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
      let idMatch = title.match(/MARADMIN\s+(\d+[/-]\d+)/i);
      if (!idMatch && description) {
        idMatch = description.match(/MARADMIN\s+(\d+[/-]\d+)/i);
      }

      if (idMatch) {
        id = idMatch[0];
        numericId = idMatch[1];
        subject = title.replace(/MARADMIN\s+\d+[/-]?\d*\s*[-:]?\s*/i, "").trim();
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
      const alnavMatch = title.match(/ALNAV\s+(\d+[/-]\d+)/i);
      if (alnavMatch) {
        id = alnavMatch[0];
        numericId = alnavMatch[1];
        subject = title.replace(/ALNAV\s+\d+[/-]?\d*\s*[-:]?\s*/i, "").trim();
      } else {
        id = `ALNAV ${index + 1}`;
        numericId = String(index + 1);
        subject = title;
      }
    } else if (type === 'almar') {
      // Extract ALMAR ID from description field first, then fall back to title
      let almarMatch = null;
      if (description) {
        almarMatch = description.match(/ALMAR\s+(\d+[/-]\d+)/i);
      }
      if (!almarMatch) {
        almarMatch = title.match(/ALMAR\s+(\d+[/-]\d+)/i);
      }

      if (almarMatch) {
        id = almarMatch[0];
        numericId = almarMatch[1];
        subject = title.replace(/ALMAR\s+\d+[/-]?\d*\s*[-:]?\s*/i, "").trim();
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

    // Build comprehensive search index
    const searchText = `${id} ${subject} ${cleanDescription}`.toLowerCase();
    // Tokenize for faster word-based searching
    const searchTokens = searchText.split(/\s+/).filter(token => token.length > 2);

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
      searchText: searchText,
      searchTokens: searchTokens, // Pre-tokenized for faster search
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

  // Update button states and ARIA attributes for accessibility
  messageTypeButtons.forEach(btn => {
    const isActive = btn.dataset.type === type;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
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

  // Get messages based on current type
  let allMessages = [];
  if (currentMessageType === 'maradmin') {
    allMessages = [...allMaradmins];
  } else if (currentMessageType === 'mcpub') {
    allMessages = [...allMcpubs];
  } else if (currentMessageType === 'almar') {
    allMessages = [...allAlmars];
  } else if (currentMessageType === 'dodforms') {
    allMessages = [...allDodForms];
  } else if (currentMessageType === 'igmc') {
    allMessages = [...allIgmcChecklists];
  } else if (currentMessageType === 'youtube') {
    allMessages = [...allYouTubePosts];
  } else if (currentMessageType === 'jtr') {
    allMessages = [...allJtrs];
  } else if (currentMessageType === 'dodfmr') {
    allMessages = [...allDodFmr];
  } else if (currentMessageType === 'secnav') {
    allMessages = [...allSecnavs];
  } else if (currentMessageType === 'alnav') {
    allMessages = [...allAlnavs];
  } else if (currentMessageType === 'all') {
    // Exclude ALNAV and SECNAV from "All Messages"
    allMessages = [...allMaradmins, ...allMcpubs, ...allAlmars, ...allDodForms, ...allIgmcChecklists, ...allYouTubePosts, ...allJtrs, ...allDodFmr];
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

  // Apply search filter with improved tokenized search
  if (searchTerm) {
    console.log(`Filtering by search term: "${searchTerm}"`);

    // Tokenize search query for multi-word search (same filter as searchTokens)
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2);

    if (searchWords.length === 1) {
      // Single word search - use the valid word, not the full search term
      filtered = filtered.filter(m => m.searchText.includes(searchWords[0]));
    } else if (searchWords.length > 1) {
      // Multi-word search - use pre-computed searchTokens for performance
      // All search words must match (AND logic)
      filtered = filtered.filter(m => {
        // Use the pre-computed searchTokens array for faster matching
        // This preserves partial matching within tokens
        return searchWords.every(word =>
          m.searchTokens.some(token => token.includes(word))
        );
      });
    } else {
      // Search term too short (all words < 3 chars), use full text search
      filtered = filtered.filter(m => m.searchText.includes(searchTerm));
    }

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

  // Reset quick filter buttons and ARIA attributes
  quickFilterButtons.forEach(btn => {
    const isToday = btn.dataset.days === "1";
    btn.classList.toggle('active', isToday);
    btn.setAttribute('aria-pressed', isToday);
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
      const isActive = btn.dataset.type === savedMessageType;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  }

  // Restore date range
  const savedDateRange = localStorage.getItem('filter_date_range');
  if (savedDateRange) {
    dateRangeSelect.value = savedDateRange;
    // Update quick filter buttons and ARIA attributes
    quickFilterButtons.forEach(btn => {
      const isPressed = btn.dataset.days === savedDateRange;
      btn.classList.toggle('active', isPressed);
      btn.setAttribute('aria-pressed', isPressed);
    });
  }
}

// Handle quick filter button clicks
function handleQuickFilter(button) {
  const days = button.dataset.days;

  // Update button states and ARIA attributes for accessibility
  quickFilterButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');

  // Update dropdown
  dateRangeSelect.value = days;

  // Save preference
  localStorage.setItem('filter_date_range', days);

  // Filter messages
  filterMessages();
}

// Handle date range dropdown change
function handleDateRangeChange() {
  // Update quick filter button states and ARIA attributes for accessibility
  quickFilterButtons.forEach(btn => {
    const isActive = btn.dataset.days === dateRangeSelect.value;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
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
  } else if (currentMessageType === 'dodforms') {
    totalCount = allDodForms.length;
  } else if (currentMessageType === 'youtube') {
    totalCount = allYouTubePosts.length;
  } else if (currentMessageType === 'all') {
    // Exclude ALNAV and SECNAV from All Messages count
    totalCount = allMaradmins.length + allMcpubs.length + allAlmars.length + allDodForms.length + allYouTubePosts.length + allJtrs.length + allDodFmr.length;
  }

  const typeLabel = currentMessageType === 'all' ? 'Messages' :
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
      case 'dodforms':
        count = getFilteredCount(allDodForms);
        baseText = 'DoD Forms';
        break;
      case 'igmc':
        count = getFilteredCount(allIgmcChecklists);
        baseText = 'IGMC';
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
        count = getFilteredCount([...allMaradmins, ...allMcpubs, ...allAlmars, ...allDodForms, ...allIgmcChecklists, ...allYouTubePosts, ...allJtrs, ...allDodFmr]);
        baseText = 'All Messages';
        break;
    }

    // Update button text with counter badge and ARIA label for accessibility
    btn.innerHTML = `${baseText} <span class="tab-counter" aria-label="${count} ${count === 1 ? 'message' : 'messages'}">${count}</span>`;
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
  } else if (currentMessageType === 'dodforms') {
    totalCount = allDodForms.length;
  } else if (currentMessageType === 'igmc') {
    totalCount = allIgmcChecklists.length;
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
    totalCount = allMaradmins.length + allMcpubs.length + allAlmars.length + allDodForms.length + allIgmcChecklists.length + allYouTubePosts.length + allJtrs.length + allDodFmr.length;
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
    const dodFormsCount = currentMessages.filter(m => m.type === 'dodforms').length;
    const igmcCount = currentMessages.filter(m => m.type === 'igmc').length;
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
        <span class="stat-label">DoD Forms:</span>
        <span class="stat-value">${dodFormsCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">IGMC:</span>
        <span class="stat-value">${igmcCount}</span>
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
  if(!text) {return "";}
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

    // Determine link URL
    const linkUrl = item.link;

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
    if (summarySection) {summarySection.style.display = 'none';}
    if (descSection) {descSection.style.display = 'none';}
    if (categorySection) {categorySection.style.display = 'none';}
    if (actionsSection) {actionsSection.style.display = 'none';}
    btn.textContent = '📋 Details';
    btn.classList.remove('details-expanded');
  } else {
    // Show message details
    detailsRow.style.display = 'block';
    if (summarySection) {summarySection.style.display = 'block';}
    if (descSection) {descSection.style.display = 'block';}
    if (categorySection) {categorySection.style.display = 'block';}
    if (actionsSection) {actionsSection.style.display = 'block';}
    btn.textContent = '📋 Hide Details';
    btn.classList.add('details-expanded');
  }
}

// Format AI summary text with enhanced HTML markup for 5W format
function formatAISummaryHTML(summary) {
  if (!summary) {return '';}

  const text = String(summary);
  const lines = text.split(/\r?\n/);
  const esc = (s) => escapeHtml(String(s || ''));

  // Title
  const titleMatch = text.match(/💰\s*(.*?)\s*💰/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  let html = '';
  if (title) {html += `<h3 class="summary-title">${esc(title)}</h3>`;}
  if (text.includes('---')) {html += '<hr class="summary-divider">';}

  // 5W table extraction
  const fiveW = { Who: '', What: '', When: '', Where: '', Why: '' };
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
      if (!currentSection) {return;}
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
      if (!l) {continue;}
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

  if (!detailsRow) {return;}

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
    const isCached = !!summary;

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
    const now = new Date().toISOString();
    localStorage.setItem("maradmin_cache", JSON.stringify(allMaradmins));
    localStorage.setItem("mcpub_cache", JSON.stringify(allMcpubs));
    localStorage.setItem("alnav_cache", JSON.stringify(allAlnavs));
    localStorage.setItem("almar_cache", JSON.stringify(allAlmars));
    localStorage.setItem("dodforms_cache", JSON.stringify(allDodForms));
    localStorage.setItem("youtube_cache", JSON.stringify(allYouTubePosts));
    localStorage.setItem("secnav_cache", JSON.stringify(allSecnavs));
    localStorage.setItem("jtr_cache", JSON.stringify(allJtrs));
    localStorage.setItem("dodfmr_cache", JSON.stringify(allDodFmr));
    localStorage.setItem("summary_cache", JSON.stringify(summaryCache));
    localStorage.setItem("cache_timestamp", now);

    // Note: YouTube cache timestamp (24hr TTL) is set in fetchYouTubeVideos when fresh data is retrieved
    console.log('[Cache] Data cached successfully at', now);
  } catch(e) {
    console.error("Failed to cache data:", e);
  }
}

function loadCachedData() {
  try {
    // Cache TTL Configuration - Different TTLs for different data types
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour for frequently updated feeds (MARADMINs, ALNAVs)
    const YOUTUBE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for YouTube (videos change slowly + quota limited)
    const SUMMARY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for AI summaries

    const ts = localStorage.getItem("cache_timestamp");
    const youtubeTs = localStorage.getItem("youtube_cache_timestamp");
    let mainCacheExpired = false;

    // Check if main cache has expired (for frequently-updated feeds)
    if (ts) {
      const cacheAge = Date.now() - new Date(ts).getTime();
      if (cacheAge > CACHE_TTL) {
        console.log(`[Cache] Main cache expired (age: ${Math.round(cacheAge / 1000 / 60)} minutes), clearing frequently-updated feeds...`);
        const feedCacheKeys = [
          "maradmin_cache", "mcpub_cache", "alnav_cache", "almar_cache",
          "dodforms_cache", "secnav_cache", "jtr_cache", "dodfmr_cache", "cache_timestamp"
        ];
        feedCacheKeys.forEach(key => localStorage.removeItem(key));
        mainCacheExpired = true;
      } else {
        console.log(`[Cache] Using cached data (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
      }
    }

    // Check summary cache expiration independently
    const summaryCacheTimestamp = localStorage.getItem("summary_cache_timestamp");
    if (summaryCacheTimestamp) {
      const summaryCacheAge = Date.now() - new Date(summaryCacheTimestamp).getTime();
      if (summaryCacheAge > SUMMARY_CACHE_TTL) {
        console.log(`[Cache] Summary cache expired (age: ${Math.round(summaryCacheAge / 1000 / 60 / 60)} hours), clearing...`);
        localStorage.removeItem("summary_cache");
        localStorage.removeItem("summary_cache_timestamp");
        summaryCache = {}; // Reset in-memory cache to prevent stale data usage
      }
    }

    // Check YouTube cache expiration independently (24-hour TTL to conserve API quota)
    if (youtubeTs) {
      const youtubeCacheAge = Date.now() - new Date(youtubeTs).getTime();
      if (youtubeCacheAge > YOUTUBE_CACHE_TTL) {
        console.log(`[Cache] YouTube cache expired (age: ${Math.round(youtubeCacheAge / 1000 / 60 / 60)} hours), will fetch fresh videos...`);
        localStorage.removeItem("youtube_cache");
        localStorage.removeItem("youtube_cache_timestamp");
      } else {
        console.log(`[Cache] Using cached YouTube data (age: ${Math.round(youtubeCacheAge / 1000 / 60 / 60)} hours, quota-saving mode)`);
      }
    }

    if (mainCacheExpired) {
      lastUpdateSpan.textContent = "Cache expired - fetching fresh data...";
      return; // Skip loading expired cache
    }

    const maradminCache = localStorage.getItem("maradmin_cache");
    const mcpubCache = localStorage.getItem("mcpub_cache");
    const alnavCache = localStorage.getItem("alnav_cache");
    const almarCache = localStorage.getItem("almar_cache");
    const summaryCacheData = localStorage.getItem("summary_cache");

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
    ErrorAnalytics.track('loadCachedData', e, { source: 'localStorage' });
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
  if (!header) {return;}

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
        // 5 = DoD Forms tab
        e.preventDefault();
        switchMessageType('dodforms');
        break;

      case '6':
        // 6 = YouTube tab
        e.preventDefault();
        switchMessageType('youtube');
        break;

      case '7':
        // 7 = All Messages tab
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
  // Create modal if it doesn't exist
  let modal = document.getElementById('helpModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.className = 'feedback-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'helpModalTitle');

    modal.innerHTML = `
      <div class="feedback-modal-content">
        <div class="feedback-modal-header">
          <h2 id="helpModalTitle">⌨️ Keyboard Shortcuts</h2>
          <button id="closeHelpModal" class="feedback-close-btn" aria-label="Close help modal">✕</button>
        </div>
        <div class="help-shortcuts">
          <div class="help-shortcut">
            <kbd>r</kbd>
            <span>Refresh messages</span>
          </div>
          <div class="help-shortcut">
            <kbd>t</kbd>
            <span>Toggle dark/light theme</span>
          </div>
          <div class="help-shortcut">
            <kbd>f</kbd> or <kbd>/</kbd>
            <span>Focus search box</span>
          </div>
          <div class="help-shortcut">
            <kbd>Ctrl</kbd> + <kbd>P</kbd>
            <span>Print current view</span>
          </div>
          <div class="help-shortcut">
            <kbd>1</kbd>-<kbd>8</kbd>
            <span>Switch between tabs</span>
          </div>
          <div class="help-shortcut">
            <kbd>Esc</kbd>
            <span>Clear search focus</span>
          </div>
          <div class="help-shortcut">
            <kbd>?</kbd>
            <span>Show this help</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    document.getElementById('closeHelpModal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    // Close on Escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.classList.add('hidden');
      }
    });
  }

  // Show modal
  modal.classList.remove('hidden');
  document.getElementById('closeHelpModal').focus();
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

// ============================================================================
// WEB VITALS TRACKING
// Performance monitoring using official Google web-vitals library
// Tracks: LCP, INP (replaces FID), CLS, FCP, TTFB
// ============================================================================

/**
 * Initialize Web Vitals tracking
 * Uses official web-vitals library for accurate, maintained metrics
 * Note: Library loaded via CDN in index.html
 */
function initWebVitals() {
  // Only track in production (not during development)
  const isProduction = window.location.hostname !== 'localhost' &&
                      window.location.hostname !== '127.0.0.1';

  if (!isProduction) {
    console.log('[Web Vitals] Skipping tracking in development mode');
    return;
  }

  // Wait for web-vitals library to load from CDN
  if (typeof webVitals === 'undefined') {
    console.warn('[Web Vitals] Library not loaded yet, will retry...');
    setTimeout(initWebVitals, 100);
    return;
  }

  console.log('[Web Vitals] Initializing with official library v' + (webVitals.version || '3.x'));

  /**
   * Report Web Vital metric with rating
   * @param {Object} metric - Web Vital metric object {name, value, rating}
   */
  function reportWebVital(metric) {
    const { name, value, rating } = metric;

    // Format value based on metric type
    const formattedValue = name === 'CLS'
      ? value.toFixed(3)
      : value.toFixed(2) + 'ms';

    // Get rating emoji
    const ratingEmoji = rating === 'good' ? '✅' :
                       rating === 'needs-improvement' ? '⚠️' : '❌';

    console.log(`[Web Vitals] ${name}: ${formattedValue}`);
    console.log(`[Web Vitals] ${name} Rating: ${rating} ${ratingEmoji}`);

    // Optional: Send to analytics
    // sendToAnalytics({ metric: name, value, rating });
  }

  // Track all Core Web Vitals with the official library
  // INP (Interaction to Next Paint) - replaced FID in March 2024
  webVitals.onINP(reportWebVital);

  // LCP (Largest Contentful Paint)
  webVitals.onLCP(reportWebVital);

  // CLS (Cumulative Layout Shift)
  webVitals.onCLS(reportWebVital);

  // FCP (First Contentful Paint)
  webVitals.onFCP(reportWebVital);

  // TTFB (Time to First Byte)
  webVitals.onTTFB(reportWebVital);
}

// Initialize Web Vitals tracking when DOM is ready
if (document.readyState === 'complete') {
  initWebVitals();
} else {
  window.addEventListener('load', initWebVitals);
}
