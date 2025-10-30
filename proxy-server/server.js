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

    const prompt = `You are a military document summarizer. Your task is to analyze this ${messageType?.toUpperCase() || 'MILITARY'} message and create a structured summary.

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
    'navy.mil'
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    res.type('html').send(response.data);
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
