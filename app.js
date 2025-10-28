// RSS Feed URLs
const RSS_FEEDS = {
  maradmin: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=1000&category=14336",
  mcpub: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=5&Site=481&max=1000",
  almar: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=1000&category=14335",
  semperadmin: "https://rss.app/feeds/HFohMep8OQ0JVoKW.xml",
  youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=si=oATayDTRgeVkwiyL"
};

// ALNAV URLs - dynamically built for current/previous year
function getAlnavUrls() {
  const now = new Date();
  const year = now.getFullYear();
  const urls = [];

  // Always include current year
  urls.push(`https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year}/`);

  // If it's January, also include last year
  if (now.getMonth() === 0) {
    urls.push(`https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year - 1}/`);
  }

  return urls;
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

// Multiple CORS proxies to try as fallbacks
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

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyA0SE-MOkBQY2Wzf5r1WKzyDo2POK4dQkI";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

let currentMessages = [];
let allMaradmins = []; // Store all MARADMINs
let allMcpubs = []; // Store all MCPUBs
let allAlnavs = []; // Store all ALNAVs
let allAlmars = []; // Store all ALMARs
let allSemperAdminPosts = []; // Store all Semper Admin posts
let allDodForms = []; // Store all DoD Forms
let currentMessageType = 'maradmin'; // Track current view: 'maradmin', 'mcpub', 'alnav', 'almar', 'semperadmin', 'dodforms', or 'all'
let summaryCache = {}; // Cache for AI-generated summaries

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadCachedData();
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
  fetchAllFeeds().then(() => {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "🔄 Refresh";
  });
});
themeToggle.addEventListener("click", toggleTheme);
searchInput.addEventListener("input", filterMessages);
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
      <div class="compact-header">
        <div>ID / Type</div>
        <div>Date</div>
        <div>Subject</div>
        <div>Keywords</div>
        <div>Actions</div>
      </div>
      ${Array(8).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="skeleton-item skeleton-id"></div>
          <div class="skeleton-item skeleton-date"></div>
          <div class="skeleton-item skeleton-subject"></div>
          <div class="skeleton-item skeleton-keywords"></div>
          <div class="skeleton-item skeleton-actions"></div>
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
  await fetchAlnavMessages(); // Scrape directly from Navy website
  await fetchFeed('almar', RSS_FEEDS.almar);
  await fetchFeed('semperadmin', RSS_FEEDS.semperadmin);
  await fetchFeed('youtube', RSS_FEEDS.youtube);

  // Fetch DoD Forms
  await fetchDodForms();

  // Update display
  filterMessages();
  updateLastUpdate();
  updateTabCounters();
}

// Fetch a specific RSS feed
async function fetchFeed(type, url) {
  console.log(`Fetching ${type.toUpperCase()}s...`);

  // Try direct fetch first
  try {
    const text = await tryDirectFetch(url);
    if (text) {
      processRSSData(text, type);
      return;
    }
  } catch(err) {
    console.log(`Direct fetch for ${type} failed, trying proxies...`, err);
  }

  // Try each CORS proxy
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
          showError(`Unable to fetch ${type.toUpperCase()}s. All proxies failed.`);
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

// Process the RSS data once fetched
function processRSSData(text, type) {
  const parsed = parseRSS(text, type);
  parsed.sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate));

  if (type === 'maradmin') {
    allMaradmins = parsed;
  } else if (type === 'mcpub') {
    allMcpubs = parsed;
  } else if (type === 'almar') {
    allAlmars = parsed;
  } else if (type === 'semperadmin') {
    allSemperAdminPosts = parsed;
  } else if (type === 'youtube') {
    allYouTubePosts = parsed;
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
    // Try direct fetch first
    let text = await tryDirectFetch(url);

    // If direct fails, try proxies
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
    console.error(`Error fetching ALNAV page ${url}:`, error);
    return [];
  }
}

// Parse ALNAV links from HTML document
function parseAlnavLinks(doc, sourceUrl) {
  const messages = [];

  // Find all links to PDF, MSG, or TXT files
  const links = doc.querySelectorAll('a[href$=".pdf"], a[href$=".msg"], a[href$=".txt"], a[href$=".PDF"], a[href$=".MSG"], a[href$=".TXT"]');

  links.forEach(link => {
    try {
      const title = link.textContent.trim();
      const href = new URL(link.getAttribute('href'), sourceUrl).href;

      if (!title || !href) return;

      // Extract ALNAV number from title or filename
      // Examples: "ALNAV 001/25", "ALNAV 001-25", "001-25.pdf"
      const alnavMatch = title.match(/ALNAV[_\s-]*(\d{3})[\/\-](\d{2,4})/i) ||
                         href.match(/ALNAV[_\s-]*(\d{3})[\/\-](\d{2,4})/i) ||
                         title.match(/(\d{3})[\/\-](\d{2,4})/) ||
                         href.match(/(\d{3})[\/\-](\d{2,4})/);

      if (!alnavMatch) return;

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

  return messages;
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

  // Check cache first
  if (summaryCache[messageKey]) {
    return summaryCache[messageKey];
  }

  try {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = '⏳';
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

    // Cache the summary
    summaryCache[messageKey] = summary;
    message.aiSummary = summary;

    // Update cache
    cacheData();

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

// Call Gemini API to generate formatted summary
async function callGeminiAPI(content, message) {
  const prompt = `Analyze this Marine Corps ${message.type.toUpperCase()} message and create a structured summary following this exact format:

💰 [TITLE IN CAPS] 💰
📅 EFFECTIVE: [Date if mentioned]
⚠️ REASON/PURPOSE: [Brief reason]
🎯 KEY POINTS:

[SECTION HEADERS IN CAPS:]
[Content organized by logical sections]

Use relevant emojis (💰 📅 ⚠️ 🎯 📋 ✅ ❌ 🔔 📢 etc.) to highlight important information.
Break down into clear sections with HEADERS IN CAPS.
Use bullet points (•) for lists.
Keep it concise but capture all critical information.
Highlight deadlines, actions required, and important dates.

Message content:
${content}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.candidates[0]?.content?.parts[0]?.text || 'Summary generation failed';

    return summary;

  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to basic extraction if API fails
    return generateBasicSummary(content, message);
  }
}

// Fallback basic summary generation
function generateBasicSummary(content, message) {
  let summary = '';

  // Extract subject
  const subjMatch = content.match(/SUBJ\/(.*?)(?:\/\/|REF)/is);
  const subject = subjMatch ? subjMatch[1].trim() : message.subject;

  summary += `📋 ${subject.toUpperCase()} 📋\n\n`;

  // Extract date if available
  const dateMatch = content.match(/R\s+(\d{6}Z\s+[A-Z]+\s+\d{2,4})/i) ||
                   content.match(/Date Signed:\s+(.*?)(?:\||$)/i);
  if (dateMatch) {
    summary += `📅 DATE: ${dateMatch[1].trim()}\n\n`;
  }

  // Extract purpose/remarks
  const purposeMatch = content.match(/(?:Purpose|Remarks)[.:]?\s*(?:\d+\.)?\s*(.*?)(?:\n\n|\d+\.|$)/is);
  if (purposeMatch) {
    summary += `🎯 PURPOSE:\n${purposeMatch[1].trim()}\n\n`;
  }

  // Extract key sections
  const sections = [];
  const sectionMatches = content.matchAll(/(\d+)\.\s+([A-Za-z\s]+)[.:]?\s+(.*?)(?=\n\d+\.|$)/gs);

  for (const match of sectionMatches) {
    const sectionTitle = match[2].trim().toUpperCase();
    const sectionContent = match[3].trim().substring(0, 500);

    if (sectionContent.length > 0) {
      sections.push(`${sectionTitle}:\n${sectionContent}\n`);
    }
  }

  if (sections.length > 0) {
    summary += sections.join('\n');
  }

  return summary;
}


// Parse RSS XML - Enhanced to extract more metadata
function parseRSS(xmlText, type){
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText,"application/xml");
  const items = Array.from(xml.querySelectorAll("item"));

  console.log(`Total RSS items found for ${type}: ${items.length}`);

  const parsed = items.map((item, index) => {
    const title = item.querySelector("title")?.textContent || "";
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const description = item.querySelector("description")?.textContent || "";
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
      // Extract ALMAR ID from title (e.g., "ALMAR 001/25")
      const almarMatch = title.match(/ALMAR\s+(\d+[-\/]\d+)/i);
      if (almarMatch) {
        id = almarMatch[0];
        numericId = almarMatch[1];
        subject = title.replace(/ALMAR\s+\d+[-\/]?\d*\s*[-:]?\s*/i, "").trim();
      } else {
        id = `ALMAR ${index + 1}`;
        numericId = String(index + 1);
        subject = title;
      }
    } else if (type === 'semperadmin') {
      // For Semper Admin posts, use title as-is
      id = title.substring(0, 50);
      numericId = String(index + 1);
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
  } else if (currentMessageType === 'alnav') {
    allMessages = [...allAlnavs];
  } else if (currentMessageType === 'almar') {
    allMessages = [...allAlmars];
  } else if (currentMessageType === 'semperadmin') {
    allMessages = [...allSemperAdminPosts];
  } else if (currentMessageType === 'dodforms') {
    allMessages = [...allDodForms];
  } else if (currentMessageType === 'all') {
    allMessages = [...allMaradmins, ...allMcpubs, ...allAlnavs, ...allAlmars, ...allSemperAdminPosts, ...allDodForms];
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
  dateRangeSelect.value = "7";

  // Reset quick filter buttons
  quickFilterButtons.forEach(btn => btn.classList.remove('active'));
  quickFilterButtons.forEach(btn => {
    if (btn.dataset.days === "7") btn.classList.add('active');
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
  } else if (currentMessageType === 'all') {
    totalCount = allMaradmins.length + allMcpubs.length + allAlnavs.length + allAlmars.length + allSemperAdminPosts.length + allDodForms.length;
  }

  const typeLabel = currentMessageType === 'all' ? 'Messages' :
                    currentMessageType === 'semperadmin' ? 'Posts' :
                    currentMessageType === 'dodforms' ? 'Forms' :
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
      case 'all':
        count = getFilteredCount([...allMaradmins, ...allMcpubs, ...allAlnavs, ...allAlmars, ...allSemperAdminPosts, ...allDodForms]);
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
  } else if (currentMessageType === 'all') {
    totalCount = allMaradmins.length + allMcpubs.length + allAlnavs.length + allAlmars.length + allSemperAdminPosts.length + allDodForms.length;
  }

  // Get date range
  const dates = currentMessages.map(m => m.pubDateObj).sort((a, b) => a - b);
  const oldestDate = dates.length > 0 ? formatDate(dates[0]) : 'N/A';
  const newestDate = dates.length > 0 ? formatDate(dates[dates.length - 1]) : 'N/A';

  // Count by type if showing all
  let typeBreakdown = '';
  if (currentMessageType === 'all') {
    const maradminCount = currentMessages.filter(m => m.type === 'maradmin').length;
    const mcpubCount = currentMessages.filter(m => m.type === 'mcpub').length;
    const alnavCount = currentMessages.filter(m => m.type === 'alnav').length;
    const almarCount = currentMessages.filter(m => m.type === 'almar').length;
    const semperAdminCount = currentMessages.filter(m => m.type === 'semperadmin').length;
    const dodFormsCount = currentMessages.filter(m => m.type === 'dodforms').length;
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
        <span class="stat-label">ALNAVs:</span>
        <span class="stat-value">${alnavCount}</span>
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

// Share message - copy link to clipboard
async function shareMessage(message) {
  try {
    await navigator.clipboard.writeText(message.link);

    // Show temporary success message
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓';
    btn.style.background = '#4caf50';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy link:', err);
    alert('Failed to copy link. Please try again.');
  }
}

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
  const table = document.createElement("div");
  table.className = "compact-view";

  // Create table structure
  table.innerHTML = `
    <div class="compact-header">
      <div class="compact-col-id">ID</div>
      <div class="compact-col-date">Date</div>
      <div class="compact-col-subject">Subject</div>
      <div class="compact-col-type">Type</div>
      <div class="compact-col-action">Action</div>
    </div>
  `;

  // Add rows
  arr.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "compact-row";
    row.dataset.index = index;

    const typeLabels = {
      'maradmin': 'MARADMIN',
      'mcpub': 'MCPUB',
      'alnav': 'ALNAV',
      'almar': 'ALMAR',
      'semperadmin': 'SEMPER ADMIN',
      'dodforms': 'DOD FORM'
    };
    const typeLabel = typeLabels[item.type] || item.type.toUpperCase();
    const typeBadge = `<span class="type-badge type-${item.type}">${typeLabel}</span>`;

    // Check if message is from today
    const isNew = isMessageNew(item.pubDateObj);
    const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';

    row.innerHTML = `
      <div class="compact-col-id">
        <span class="compact-id">${item.id}</span>
        ${newBadge}
      </div>
      <div class="compact-col-date">
        <span class="compact-date">${formatDate(item.pubDateObj)}</span>
      </div>
      <div class="compact-col-subject">
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="compact-subject">${item.subject}</a>
      </div>
      <div class="compact-col-type">
        ${typeBadge}
      </div>
      <div class="compact-col-action">
        <button class="compact-ai-btn" onclick="toggleAISummary(${index}, currentMessages[${index}])" title="Generate AI Summary">
          AI Summary
        </button>
        <button class="compact-expand-btn" onclick="toggleCompactDetails(${index}, currentMessages[${index}])">
          Details
        </button>
        <button class="compact-share-btn" onclick="shareMessage(currentMessages[${index}])" title="Copy link to clipboard">
          🔗
        </button>
      </div>
    `;

    // Add expandable details row
    const detailsRow = document.createElement("div");
    detailsRow.className = "compact-details-row";
    detailsRow.id = `compact-details-${index}`;
    detailsRow.style.display = "none";
    detailsRow.innerHTML = `
      <div class="compact-details-content">
        <div class="compact-summary">
          <strong>Summary:</strong> ${item.summary}
        </div>
        ${item.category ? `<div class="compact-category"><strong>Category:</strong> ${item.category}</div>` : ''}
        <div class="compact-actions">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="compact-link-btn">View Full Message →</a>
        </div>
      </div>
    `;

    table.appendChild(row);
    table.appendChild(detailsRow);
  });

  resultsDiv.appendChild(table);
}

// Toggle details in compact view
function toggleCompactDetails(index, message) {
  const detailsRow = document.getElementById(`compact-details-${index}`);
  const btn = event.target;

  if (detailsRow.style.display === 'block') {
    detailsRow.style.display = 'none';
    btn.textContent = 'Details';
  } else {
    detailsRow.style.display = 'block';
    btn.textContent = 'Hide';
  }
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
      btn.textContent = 'Hide Summary';
    } else {
      existingSummary.style.display = 'none';
      btn.textContent = 'AI Summary';
    }
    return;
  }

  // Generate new summary
  try {
    const messageKey = `${message.type}_${message.numericId}`;
    let summary = summaryCache[messageKey] || message.aiSummary;

    if (!summary) {
      btn.disabled = true;
      btn.textContent = 'Generating...';

      summary = await generateAISummary(message, btn);

      btn.disabled = false;
    }

    // Add summary to details row - properly escape HTML
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'ai-summary-display';

    const header = document.createElement('div');
    header.className = 'ai-summary-header';
    header.innerHTML = '<span class="ai-summary-title">🤖 AI-Generated Summary</span>';

    const textDiv = document.createElement('div');
    textDiv.className = 'ai-summary-text';
    // Escape HTML then convert newlines to <br>
    textDiv.innerHTML = escapeHtml(summary).replace(/\n/g, '<br>');

    summaryDiv.appendChild(header);
    summaryDiv.appendChild(textDiv);

    const content = detailsRow.querySelector('.compact-details-content');
    const summarySection = detailsRow.querySelector('.compact-summary');
    if (summarySection) {
      content.insertBefore(summaryDiv, summarySection);
    } else {
      content.appendChild(summaryDiv);
    }

    btn.textContent = 'Hide Summary';

  } catch (error) {
    console.error('Error displaying AI summary:', error);
    btn.disabled = false;
    btn.textContent = '❌ Retry';
    alert('Failed to generate summary. Please try again.');
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

function showError(msg) {
  errorDiv.innerHTML = msg;
  errorDiv.classList.remove("hidden");

  // Auto-hide after showing cached data successfully
  if (allMaradmins.length > 0) {
    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, 10000);
  }
}

function cacheData() {
  try {
    localStorage.setItem("maradmin_cache", JSON.stringify(allMaradmins));
    localStorage.setItem("mcpub_cache", JSON.stringify(allMcpubs));
    localStorage.setItem("alnav_cache", JSON.stringify(allAlnavs));
    localStorage.setItem("almar_cache", JSON.stringify(allAlmars));
    localStorage.setItem("semperadmin_cache", JSON.stringify(allSemperAdminPosts));
    localStorage.setItem("dodforms_cache", JSON.stringify(allDodForms));
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

// Initialize sticky header scroll behavior
function initStickyHeader() {
  const header = document.querySelector('header');
  let lastScrollTop = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    lastScrollTop = window.scrollY;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (lastScrollTop > 100) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  });
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
  const shortcuts = `
    KEYBOARD SHORTCUTS

    r         - Refresh messages
    t         - Toggle dark/light theme
    f or /    - Focus search box
    Ctrl+P    - Print current view
    1-7       - Switch between tabs
    Esc       - Clear search focus
    ?         - Show this help
  `;
  alert(shortcuts);
}
