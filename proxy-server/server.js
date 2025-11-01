const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Rate limiting to prevent abuse
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys - MUST be set as environment variables
// In production: Set as GitHub Secrets or hosting environment variables
// NO HARDCODED KEYS - Security requirement
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SEMPER_ADMIN_API_KEY = process.env.SEMPER_ADMIN_API_KEY; // Facebook Page Access Token
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCob5u7jsXrdca9vmarYJ0Cg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID || "61558093420252"; // Semper Admin Facebook Page
const FACEBOOK_API_VERSION = "v18.0"; // Facebook Graph API version

// Validate required environment variables
if (!YOUTUBE_API_KEY) {
  console.error('❌ CRITICAL: YOUTUBE_API_KEY environment variable is not set');
  console.error('   Set it in your hosting environment or GitHub Secrets');
}

if (!GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY environment variable is not set');
  console.error('   Set it in your hosting environment or GitHub Secrets');
}

if (!SEMPER_ADMIN_API_KEY) {
  console.error('❌ CRITICAL: SEMPER_ADMIN_API_KEY environment variable is not set');
  console.error('   Set it in your hosting environment or GitHub Secrets');
}

// Warn if running without keys (will cause API calls to fail)
if (!YOUTUBE_API_KEY || !GEMINI_API_KEY || !SEMPER_ADMIN_API_KEY) {
  console.warn('⚠️  Server starting WITHOUT API keys - API endpoints will fail');
  console.warn('   This is OK for development, but REQUIRED for production');
}

// Enable CORS for your GitHub Pages site
app.use(cors({
  origin: ['https://semperadmin.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'],
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Enable JSON body parsing
app.use(express.json());

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const summaryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit AI summary generation to 10 per minute
  message: { success: false, error: 'Too many summary requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Disable SSL verification for Navy sites (they may have certificate issues)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// AI Summary storage configuration
const SUMMARIES_FILE = path.join(__dirname, 'ai-summaries.json');

// Load summaries from file
async function loadSummaries() {
  try {
    const data = await fs.readFile(SUMMARIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty object
    return {};
  }
}

// Save summaries to file
async function saveSummaries(summaries) {
  try {
    await fs.writeFile(SUMMARIES_FILE, JSON.stringify(summaries, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving summaries:', error);
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy endpoint for ALNAV
app.get('/api/alnav/:year', async (req, res) => {
  const year = req.params.year;
  const url = `https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year}/`;

  console.log(`Fetching ALNAV for year ${year}...`);

  try {
    const response = await axios.get(url, {
      httpsAgent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    res.type('html').send(response.data);
  } catch (error) {
    console.error(`Error fetching ALNAV: ${error.message}`);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch ALNAV data',
      message: error.message,
      url: url
    });
  }
});

// Proxy endpoint for SECNAV/OPNAV directives
app.get('/api/navy-directives', async (req, res) => {
  const url = 'https://www.secnav.navy.mil/doni/Directives/Forms/Secnav%20Current.aspx';

  console.log('Fetching SECNAV/OPNAV directives...');

  try {
    const response = await axios.get(url, {
      httpsAgent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    res.type('html').send(response.data);
  } catch (error) {
    console.error(`Error fetching SECNAV: ${error.message}`);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch SECNAV data',
      message: error.message,
      url: url
    });
  }
});

// Get AI summary for a specific message
app.get('/api/summary/:messageKey', async (req, res) => {
  try {
    const messageKey = req.params.messageKey;
    const summaries = await loadSummaries();

    if (summaries[messageKey]) {
      res.json({
        success: true,
        summary: summaries[messageKey].summary,
        timestamp: summaries[messageKey].timestamp
      });
    } else {
      res.status(404).json({ success: false, message: 'Summary not found' });
    }
  } catch (error) {
    console.error('Error retrieving summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save AI summary for a specific message
app.post('/api/summary', async (req, res) => {
  try {
    const { messageKey, summary, messageType, messageId } = req.body;

    if (!messageKey || !summary) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const summaries = await loadSummaries();
    summaries[messageKey] = {
      summary,
      messageType,
      messageId,
      timestamp: new Date().toISOString()
    };

    const saved = await saveSummaries(summaries);

    if (saved) {
      res.json({ success: true, message: 'Summary saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save summary' });
    }
  } catch (error) {
    console.error('Error saving summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all summaries (for debugging/admin purposes)
app.get('/api/summaries', async (req, res) => {
  try {
    const summaries = await loadSummaries();
    const count = Object.keys(summaries).length;
    res.json({ success: true, count, summaries });
  } catch (error) {
    console.error('Error retrieving summaries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy endpoint for YouTube API
app.get('/api/youtube/videos', async (req, res) => {
  // Check if API key is configured
  if (!YOUTUBE_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'YouTube API key not configured',
      message: 'Server administrator must set YOUTUBE_API_KEY environment variable'
    });
  }

  try {
    const { pageToken, maxResults = 50 } = req.query;

    const params = {
      part: 'snippet',
      channelId: YOUTUBE_CHANNEL_ID,
      maxResults: Math.min(maxResults, 50),
      order: 'date',
      type: 'video',
      key: YOUTUBE_API_KEY
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params,
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('YouTube API error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch YouTube videos',
      message: error.message
    });
  }
});

// Proxy endpoint for Facebook API - Semper Admin posts
app.get('/api/facebook/semperadmin', async (req, res) => {
  // Check if API key is configured
  if (!SEMPER_ADMIN_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'Facebook API key not configured',
      message: 'Server administrator must set SEMPER_ADMIN_API_KEY environment variable'
    });
  }

  console.log('Fetching Semper Admin posts from Facebook...');

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/posts`,
      {
        headers: {
          'Authorization': `Bearer ${SEMPER_ADMIN_API_KEY}`
        },
        params: {
          fields: 'id,message,story,created_time,permalink_url,full_picture',
          limit: 100
        },
        timeout: 30000
      }
    );

    res.json({
      success: true,
      posts: response.data.data || []
    });
  } catch (error) {
    console.error('Facebook API error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch Semper Admin posts',
      message: error.message
    });
  }
});

// Proxy endpoint for Gemini API (with stricter rate limiting)
app.post('/api/gemini/summarize', summaryLimiter, async (req, res) => {
  // Check if API key is configured
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'Gemini API key not configured',
      message: 'Server administrator must set GEMINI_API_KEY environment variable'
    });
  }

  try {
    const { content, messageType } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const prompt = `You are a military document summarizer. You MUST analyze the ${messageType?.toUpperCase() || 'MILITARY'} message and provide ONLY a structured summary in the EXACT format specified below.

CRITICAL: Do NOT include any raw message text, headers, or unformatted content. ONLY output the formatted summary as shown.

REQUIRED OUTPUT FORMAT - FOLLOW EXACTLY:

💰 [WRITE CONCISE TITLE IN ALL CAPS - NO MESSAGE HEADERS] 💰
---
**5W OVERVIEW:**
* **WHO:** [Specific personnel affected - ranks, units, MOSs, or "All Marines"]
* **WHAT:** [The main action, policy change, or requirement in ONE clear sentence]
* **WHEN:** [Effective date in "DD MMM YYYY" format OR deadline OR "Immediate" OR "N/A"]
* **WHERE:** [Geographic scope - specific bases, CONUS, OCONUS, worldwide, or "N/A"]
* **WHY:** [Purpose or justification in ONE sentence - avoid vague statements]

---
🎯 **KEY POINTS:**

**[SECTION NAME IN ALL CAPS]:**
• [Actionable bullet point]
• [Actionable bullet point]

**[ANOTHER SECTION IN ALL CAPS]:**
• [Actionable bullet point]
• [Actionable bullet point]

EXAMPLE OF CORRECT OUTPUT:

💰 OFFICER PROMOTIONS FOR NOVEMBER 2025 💰
---
**5W OVERVIEW:**
* **WHO:** Selected officers listed in this message
* **WHAT:** Promotion to next higher rank effective 1 November 2025
* **WHEN:** 01 NOV 2025
* **WHERE:** All commands worldwide
* **WHY:** Recognition of demonstrated performance and time in grade

---
🎯 **KEY POINTS:**

**PROMOTION AUTHORITY:**
• Authorized by Secretary of the Navy under Title 10 USC 624
• Commanding officers may effect promotions immediately upon message receipt
• Commissions will be mailed within 4-6 weeks (not required for promotion)

**OFFICER ACTIONS:**
• Verify name appears on promotion list
• Coordinate with S-1/Admin for rank update in MCTFS
• Update all official documents with new rank

**WHAT NOT TO DO:**
- DO NOT copy/paste message headers (SUBJ/, REF/, GENTEXT, etc.)
- DO NOT include raw authority references or legal citations
- DO NOT leave any W field blank or use just "/"
- DO NOT exceed 350 words total
- DO NOT include message formatting artifacts

MANDATORY RULES:
1. ALL FIVE Ws MUST have meaningful answers - "N/A" only if truly not applicable
2. Each W answer must be ONE line maximum
3. Start with the title line using 💰 emoji
4. Use bullet points (•) for all lists under KEY POINTS
5. Section headers must be ALL CAPS followed by colon
6. Maximum 350 words total - be concise and actionable
7. Focus on WHO is affected, WHAT they must do, and WHEN it's due

Now analyze this message and output ONLY the formatted summary:

${content}`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,  // Very low for maximum format consistency
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000
      }
    );

    const summary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary generation failed';
    res.json({ success: true, summary });

  } catch (error) {
    console.error('Gemini API error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

// Generic proxy endpoint (use with caution)
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Whitelist allowed domains for security
  const allowedDomains = [
    'mynavyhr.navy.mil',
    'secnav.navy.mil',
    'navy.mil',
    'marines.mil',        // USMC RSS feeds (MARADMIN, MCPUB, ALMAR)
    'rss.app',            // RSS feed proxy for ALNAV, SECNAV
    'fetchrss.com',       // RSS feed proxy for SemperAdmin
    'travel.dod.mil'      // DoD JTR (Joint Travel Regulations)
  ];

  const urlObj = new URL(targetUrl);
  const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Domain not allowed',
      allowedDomains: allowedDomains
    });
  }

  console.log(`Proxying request to: ${targetUrl}`);

  try {
    const response = await axios.get(targetUrl, {
      httpsAgent,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/rss+xml'
      }
    });

    // Detect content type from response or URL
    const contentType = response.headers['content-type'] ||
                       (targetUrl.includes('.xml') || targetUrl.includes('/rss') || targetUrl.includes('rss.')
                         ? 'application/xml'
                         : 'text/html');

    res.type(contentType).send(response.data);
  } catch (error) {
    console.error(`Error proxying request: ${error.message}`);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch data',
      message: error.message,
      url: targetUrl
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`ALNAV endpoint: http://localhost:${PORT}/api/alnav/2025`);
  console.log(`SECNAV endpoint: http://localhost:${PORT}/api/navy-directives`);
  console.log(`Facebook endpoint: http://localhost:${PORT}/api/facebook/semperadmin`);
  console.log(`AI Summaries endpoint: http://localhost:${PORT}/api/summaries`);
  console.log(`Save summary: POST http://localhost:${PORT}/api/summary`);
  console.log(`Get summary: GET http://localhost:${PORT}/api/summary/:messageKey`);
});
