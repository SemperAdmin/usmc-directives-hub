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
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCob5u7jsXrdca9vmarYJ0Cg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Validate required environment variables
if (!YOUTUBE_API_KEY) {
  console.error('❌ CRITICAL: YOUTUBE_API_KEY environment variable is not set');
  console.error('   Set it in your hosting environment or GitHub Secrets');
}

if (!GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY environment variable is not set');
  console.error('   Set it in your hosting environment or GitHub Secrets');
}

// Warn if running without keys (will cause API calls to fail)
if (!YOUTUBE_API_KEY || !GEMINI_API_KEY) {
  console.warn('⚠️  Server starting WITHOUT API keys - API endpoints will fail');
  console.warn('   This is OK for development, but REQUIRED for production');
}

// Enable CORS for your GitHub Pages site
app.use(cors({
  origin: ['https://semperadmin.github.io', 'http://localhost:8000'],
  methods: ['GET', 'POST', 'PUT'],
  credentials: true
}));

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

    const prompt = `You are a military document summarizer. Analyze the ${messageType?.toUpperCase() || 'MILITARY'} message below and provide a summary in the EXACT format specified.

REQUIRED OUTPUT FORMAT (copy this structure exactly):

💰 [TITLE OF MESSAGE IN ALL CAPS] 💰
---
**5W OVERVIEW:**
* **WHO:** [affected personnel/units]
* **WHAT:** [main action/change/requirement]
* **WHEN:** [effective date in format "01 JAN 2025" or "N/A"]
* **WHERE:** [location/command or "All Marines" or "N/A"]
* **WHY:** [reason/purpose in one sentence]

---
🎯 **KEY POINTS/ACTIONS:**

**[FIRST SECTION IN CAPS]:**
• [key point or action item]
• [key point or action item]

**[SECOND SECTION IN CAPS]:**
• [key point or action item]
• [key point or action item]

EXAMPLE OUTPUT:

💰 ANNUAL TRAINING REQUIREMENTS FOR FY 2025 💰
---
**5W OVERVIEW:**
* **WHO:** All Active Duty and Reserve Marines
* **WHAT:** Mandatory completion of annual training requirements
* **WHEN:** 31 MAR 2025
* **WHERE:** All Marine Corps installations worldwide
* **WHY:** Ensure readiness and compliance with DoD training standards

---
🎯 **KEY POINTS/ACTIONS:**

**REQUIRED TRAINING:**
• Annual Cyber Awareness Challenge - due 31 JAN 2025
• Sexual Assault Prevention training - due 28 FEB 2025
• Operational Security (OPSEC) training - due 31 MAR 2025

**COMPLETION PROCESS:**
• Access training via MarineNet portal
• Complete assessments with 80% minimum score
• Submit completion certificates to unit training officer

**NON-COMPLIANCE:**
• May result in negative administrative action
• Unit commanders will track and report compliance monthly

STRICT REQUIREMENTS:
1. The 5W OVERVIEW section is MANDATORY - all 5 must be answered
2. Keep each W answer to ONE line maximum
3. Use bullet points (•) for all lists
4. Section headers in KEY POINTS must be ALL CAPS and end with colon
5. Keep total output under 400 words
6. Focus only on actionable information and critical deadlines

Now analyze this message:

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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
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
    'fetchrss.com'        // RSS feed proxy for SemperAdmin
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
  console.log(`AI Summaries endpoint: http://localhost:${PORT}/api/summaries`);
  console.log(`Save summary: POST http://localhost:${PORT}/api/summary`);
  console.log(`Get summary: GET http://localhost:${PORT}/api/summary/:messageKey`);
});
