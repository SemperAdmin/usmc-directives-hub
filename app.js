// RSS Feed URLs
const RSS_FEEDS = {
  maradmin: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=1000&category=14336",
  mcpub: "https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=5&Site=481&max=1000"
};

// Multiple CORS proxies to try as fallbacks
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
  "https://api.codetabs.com/v1/proxy?quest="
];

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const viewToggle = document.getElementById("viewToggle");
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

let currentMessages = [];
let allMaradmins = []; // Store all MARADMINs
let allMcpubs = []; // Store all MCPUBs
let currentMessageType = 'maradmin'; // Track current view: 'maradmin', 'mcpub', or 'all'
let currentView = 'detailed'; // Track view mode: 'detailed' or 'compact'
let summaryCache = {}; // Cache for AI-generated summaries

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadCachedData();
  fetchAllFeeds();
  initTheme();
});
refreshBtn.addEventListener("click", fetchAllFeeds);
exportBtn.addEventListener("click", exportToJSON);
viewToggle.addEventListener("click", toggleView);
themeToggle.addEventListener("click", toggleTheme);
searchInput.addEventListener("input", filterMessages);
dateRangeSelect.addEventListener("change", filterMessages);
clearSearchBtn.addEventListener("click", clearSearch);
messageTypeButtons.forEach(btn => {
  btn.addEventListener("click", () => switchMessageType(btn.dataset.type));
});

// Fetch all RSS feeds (MARADMINs and MCPUBs)
async function fetchAllFeeds() {
  statusDiv.textContent = "Fetching messages...";
  errorDiv.classList.add("hidden");

  // Fetch MARADMINs
  await fetchFeed('maradmin', RSS_FEEDS.maradmin);

  // Fetch MCPUBs
  await fetchFeed('mcpub', RSS_FEEDS.mcpub);

  // Update display
  filterMessages();
  updateLastUpdate();
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
  }

  cacheData();
  console.log(`Loaded ${parsed.length} ${type.toUpperCase()}s`);
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

// Generate AI summary for a message
async function generateAISummary(message, buttonElement) {
  const messageKey = `${message.type}_${message.numericId}`;

  // Check cache first
  if (summaryCache[messageKey]) {
    return summaryCache[messageKey];
  }

  try {
    if (buttonElement) {
      buttonElement.disabled = true;
      buttonElement.textContent = '⏳ Generating Summary...';
    }

    // Use WebFetch to get content and generate summary
    const prompt = `Analyze this Marine Corps ${message.type.toUpperCase()} message and create a structured summary following this exact format:

[EMOJI] [TITLE IN CAPS] [EMOJI]
📅 EFFECTIVE: [Date if mentioned]
⚠️ REASON/PURPOSE: [Brief reason]
🎯 KEY POINTS:

[SECTION HEADERS IN CAPS:]
[Content organized by logical sections]

Use relevant emojis (💰 📅 ⚠️ 🎯 📋 ✅ ❌ 🔔 📢 etc.) to highlight important information.
Break down into clear sections with BOLD HEADERS.
Use bullet points (•) for lists.
Keep it concise but capture all critical information.
Highlight deadlines, actions required, and important dates.

Here's an example format:
💰 FY26 SELECTIVE RETENTION BONUS PROGRAM CLOSURE 💰
📅 EFFECTIVE: 28 October 2025
🎯 PURPOSE: Announce closure of FY26 SRBP

CRITICAL DETAILS:
• Key point 1
• Key point 2

ACTION REQUIRED:
Details here...`;

    // Try to fetch and summarize
    const response = await fetch(message.link);
    if (!response.ok) {
      throw new Error('Failed to fetch message content');
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyText = doc.body?.textContent || '';

    // Extract the main message content (usually after "GENTEXT" or "SUBJ")
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

    // Limit content length for processing
    messageContent = messageContent.substring(0, 8000);

    // Generate structured summary using Claude
    const summary = await generateFormattedSummary(messageContent, message);

    // Cache the summary
    summaryCache[messageKey] = summary;
    message.aiSummary = summary;

    // Update cache
    cacheData();

    if (buttonElement) {
      buttonElement.textContent = '🤖 AI Summary';
      buttonElement.disabled = false;
    }

    return summary;

  } catch (error) {
    console.error('Error generating AI summary:', error);
    if (buttonElement) {
      buttonElement.textContent = '❌ Summary Failed (Retry)';
      buttonElement.disabled = false;
    }
    throw error;
  }
}

// Generate formatted summary using AI-like processing
async function generateFormattedSummary(content, message) {
  // This is a simplified version - in production you'd use an actual AI API
  // For now, we'll extract and format key information

  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  let summary = '';

  // Extract subject
  const subjMatch = content.match(/SUBJ\/(.*?)(?:\/\/|REF)/is);
  const subject = subjMatch ? subjMatch[1].trim() : message.subject;

  // Add title with emoji
  summary += `📋 ${subject.toUpperCase()} 📋\n\n`;

  // Extract date if available
  const dateMatch = content.match(/R\s+(\d{6}Z\s+[A-Z]+\s+\d{2,4})/i) ||
                   content.match(/Date Signed:\s+(.*?)(?:\||$)/i);
  if (dateMatch) {
    summary += `📅 DATE: ${dateMatch[1].trim()}\n`;
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
  } else {
    // Fallback: use first few paragraphs
    const paragraphs = content.split('\n\n').slice(0, 3);
    summary += paragraphs.join('\n\n');
  }

  // Add action items if found
  const actionMatch = content.match(/(?:Action|Command)[.:]?\s*(?:\d+\.)?\s*(.*?)(?:\n\n|\d+\.|$)/is);
  if (actionMatch) {
    summary += `\n\n⚠️ ACTION REQUIRED:\n${actionMatch[1].trim().substring(0, 400)}`;
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
  } else if (currentMessageType === 'all') {
    allMessages = [...allMaradmins, ...allMcpubs];
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
}

function clearSearch() {
  searchInput.value = "";
  dateRangeSelect.value = "30";
  filterMessages();
}

function updateResultsCount() {
  const totalCount = currentMessageType === 'maradmin' ? allMaradmins.length :
                     currentMessageType === 'mcpub' ? allMcpubs.length :
                     allMaradmins.length + allMcpubs.length;

  const typeLabel = currentMessageType === 'all' ? 'Messages' : currentMessageType.toUpperCase() + 's';

  const countText = currentMessages.length === totalCount
    ? `Showing all ${currentMessages.length} ${typeLabel}`
    : `Showing ${currentMessages.length} of ${totalCount} ${typeLabel}`;
  statusDiv.textContent = countText;
}

// Toggle between detailed and compact view
function toggleView() {
  currentView = currentView === 'detailed' ? 'compact' : 'detailed';
  viewToggle.textContent = currentView === 'detailed' ? 'Compact View' : 'Detailed View';

  // Update results display
  renderMaradmins(currentMessages);

  // Show/hide summary stats
  if (currentView === 'compact') {
    renderSummaryStats();
    summaryStatsDiv.classList.remove('hidden');
  } else {
    summaryStatsDiv.classList.add('hidden');
  }
}

// Render summary statistics panel
function renderSummaryStats() {
  const totalCount = currentMessageType === 'maradmin' ? allMaradmins.length :
                     currentMessageType === 'mcpub' ? allMcpubs.length :
                     allMaradmins.length + allMcpubs.length;

  // Get date range
  const dates = currentMessages.map(m => m.pubDateObj).sort((a, b) => a - b);
  const oldestDate = dates.length > 0 ? formatDate(dates[0]) : 'N/A';
  const newestDate = dates.length > 0 ? formatDate(dates[dates.length - 1]) : 'N/A';

  // Count by type if showing all
  let typeBreakdown = '';
  if (currentMessageType === 'all') {
    const maradminCount = currentMessages.filter(m => m.type === 'maradmin').length;
    const mcpubCount = currentMessages.filter(m => m.type === 'mcpub').length;
    typeBreakdown = `
      <div class="stat-item">
        <span class="stat-label">MARADMINs:</span>
        <span class="stat-value">${maradminCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">MCPUBs:</span>
        <span class="stat-value">${mcpubCount}</span>
      </div>
    `;
  }

  summaryStatsDiv.innerHTML = `
    <h3>Summary Overview</h3>
    <div class="stats-grid">
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

// Utilities
function firstSentence(text) {
  if(!text) return "";
  const m = text.replace(/<[^>]*>/g,"").match(/^[^.!?]+[.!?]/);
  return m ? m[0] : text.substring(0,150)+"...";
}

function renderMaradmins(arr) {
  resultsDiv.innerHTML = "";
  if (arr.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No messages found matching your criteria.</div>';
    return;
  }

  // Check current view mode
  if (currentView === 'compact') {
    renderCompactView(arr);
  } else {
    renderDetailedView(arr);
  }
}

// Render detailed card view (original layout)
function renderDetailedView(arr) {
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
      <div class="ai-summary-section" id="ai-summary-${index}" style="display:none;">
        <div class="ai-summary-content"></div>
      </div>
      <div class="maradmin-details" id="details-${index}" style="display:none;">
        <div class="loading-details">Loading details...</div>
      </div>
      <div class="maradmin-footer">
        ${item.category ? `<span class="category">${item.category}</span>` : ''}
        <button class="ai-summary-btn" onclick="toggleAISummary(${index}, currentMessages[${index}])">
          🤖 AI Summary
        </button>
        <button class="expand-btn" onclick="toggleDetails(${index}, currentMessages[${index}])">
          ${item.detailsFetched && item.pdfUrl ? '📋 Hide Details' : '📄 Show Details'}
        </button>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="view-full">View Full Message →</a>
      </div>
    `;
    resultsDiv.appendChild(div);
  });
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

    const typeLabel = item.type === 'maradmin' ? 'MARADMIN' : 'MCPUB';
    const typeBadge = `<span class="type-badge type-${item.type}">${typeLabel}</span>`;

    row.innerHTML = `
      <div class="compact-col-id">
        <span class="compact-id">${item.id}</span>
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
          🤖
        </button>
        <button class="compact-expand-btn" onclick="toggleCompactDetails(${index}, currentMessages[${index}])">
          Details
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

// Toggle AI-generated summary
async function toggleAISummary(index, message) {
  const summarySection = document.getElementById(`ai-summary-${index}`);
  const btn = event.target;

  // If already visible, hide it
  if (summarySection && summarySection.style.display === 'block') {
    summarySection.style.display = 'none';
    if (btn.classList.contains('ai-summary-btn')) {
      btn.textContent = '🤖 AI Summary';
    }
    return;
  }

  // Show loading state
  if (!summarySection) {
    // For compact view, create summary section if it doesn't exist
    const detailsRow = document.getElementById(`compact-details-${index}`);
    if (detailsRow) {
      const existingSummary = detailsRow.querySelector('.ai-summary-display');
      if (existingSummary) {
        if (existingSummary.style.display === 'block') {
          existingSummary.style.display = 'none';
          btn.textContent = '🤖';
          return;
        }
        existingSummary.style.display = 'block';
        btn.textContent = '✓';
        return;
      }
    }
  }

  try {
    // Generate summary if not cached
    const messageKey = `${message.type}_${message.numericId}`;
    let summary = summaryCache[messageKey] || message.aiSummary;

    if (!summary) {
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = btn.classList.contains('ai-summary-btn') ? '⏳ Generating...' : '⏳';

      summary = await generateAISummary(message, null);

      btn.disabled = false;
      btn.textContent = btn.classList.contains('ai-summary-btn') ? '🤖 AI Summary' : '🤖';
    }

    // Display summary
    if (summarySection) {
      // Detailed view
      const contentDiv = summarySection.querySelector('.ai-summary-content');
      contentDiv.innerHTML = `
        <div class="ai-summary-header">
          <span class="ai-summary-title">🤖 AI-Generated Summary</span>
        </div>
        <div class="ai-summary-text">${summary.replace(/\n/g, '<br>')}</div>
      `;
      summarySection.style.display = 'block';
      btn.textContent = '✓ Hide Summary';
    } else {
      // Compact view - add to details row
      const detailsRow = document.getElementById(`compact-details-${index}`);
      if (detailsRow) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'ai-summary-display';
        summaryDiv.innerHTML = `
          <div class="ai-summary-header">
            <span class="ai-summary-title">🤖 AI-Generated Summary</span>
          </div>
          <div class="ai-summary-text">${summary.replace(/\n/g, '<br>')}</div>
        `;
        detailsRow.querySelector('.compact-details-content').insertBefore(
          summaryDiv,
          detailsRow.querySelector('.compact-summary')
        );
        btn.textContent = '✓';
      }
    }

  } catch (error) {
    console.error('Error displaying AI summary:', error);
    btn.disabled = false;
    btn.textContent = btn.classList.contains('ai-summary-btn') ? '❌ Retry' : '❌';
    alert('Failed to generate summary. Please try again.');
  }
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

function exportToJSON() {
  if(!currentMessages.length) {
    showError("No data to export.");
    return;
  }
  const exportData = currentMessages.map(m => ({
    type: m.type,
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
  const filename = `${currentMessageType}_${new Date().toISOString().split("T")[0]}.json`;
  a.download = filename;
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
