const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const { buildSummaryPrompt } = require('./prompts');

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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // GitHub Personal Access Token for creating issues
const GITHUB_REPO = process.env.GITHUB_REPO || "SemperAdmin/usmc-directives-hub"; // GitHub repo (owner/repo)
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCob5u7jsXrdca9vmarYJ0Cg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID; // Semper Admin Facebook Page (required - no fallback)
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

if (!FACEBOOK_PAGE_ID) {
  console.error('❌ CRITICAL: FACEBOOK_PAGE_ID environment variable is not set');
  console.error('   Set it to your Facebook Page ID (e.g., 280042265193211)');
  console.error('   Find it at: https://www.facebook.com/your-page > About > Page ID');
}

if (!GITHUB_TOKEN) {
  console.error('❌ WARNING: GITHUB_TOKEN environment variable is not set');
  console.error('   Feedback widget will not be able to create GitHub issues');
  console.error('   Create a GitHub Personal Access Token with repo scope');
}

// Warn if running without keys (will cause API calls to fail)
if (!YOUTUBE_API_KEY || !GEMINI_API_KEY || !SEMPER_ADMIN_API_KEY || !FACEBOOK_PAGE_ID) {
  console.warn('⚠️  Server starting WITHOUT required environment variables - API endpoints will fail');
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

// Debug endpoint to test GitHub API configuration
app.get('/api/debug/github', async (req, res) => {
  const results = {
    tokenConfigured: !!GITHUB_TOKEN,
    tokenPrefix: GITHUB_TOKEN ? GITHUB_TOKEN.substring(0, 7) + '...' : 'NOT SET',
    repoConfigured: !!GITHUB_REPO,
    repo: GITHUB_REPO || 'NOT SET',
    testPayload: null,
    apiTest: null
  };

  // Create a test payload to show what would be sent
  results.testPayload = {
    title: '[BUG REPORT] Test feedback',
    body: '## User Feedback\n\n**Type:** Bug Report\n\n**Description:**\nThis is a test.\n\n---\n\n## Context\n- **Browser:** Test\n\n---\n*This issue was automatically created via the in-app feedback widget.*'
  };

  // Test GitHub API if token is configured
  if (GITHUB_TOKEN && GITHUB_REPO) {
    try {
      // Test authentication by getting repo info
      const response = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          timeout: 10000
        }
      );

      results.apiTest = {
        success: true,
        repoExists: true,
        repoName: response.data.full_name,
        hasIssues: response.data.has_issues,
        permissions: {
          // Only expose relevant permissions for debugging
          admin: response.data.permissions?.admin || false,
          push: response.data.permissions?.push || false,
          pull: response.data.permissions?.pull || false
        }
      };
    } catch (error) {
      results.apiTest = {
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message
      };
    }
  } else {
    results.apiTest = { success: false, error: 'Token or repo not configured' };
  }

  res.json(results);
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
  console.log(`Facebook API URL: https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/posts`);
  console.log(`Page ID: ${FACEBOOK_PAGE_ID}`);
  console.log(`API Version: ${FACEBOOK_API_VERSION}`);

  try {
    const allPosts = [];
    let pageCount = 0;
    const maxPages = 10; // Safety limit to prevent infinite loops (10 pages * 25 posts = ~250 posts)
    const postsPerPage = 25; // Facebook's typical page size

    // Construct initial URL with parameters
    const initialParams = new URLSearchParams({
      fields: 'id,message,story,created_time,permalink_url,full_picture',
      limit: postsPerPage.toString()
    });
    let nextUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/posts?${initialParams.toString()}`;

    // Pagination loop - fetch all pages of posts
    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`Fetching Facebook posts - page ${pageCount}...`);

      const response = await axios.get(nextUrl, {
        headers: {
          'Authorization': `Bearer ${SEMPER_ADMIN_API_KEY}`
        },
        timeout: 30000
      });

      // Add posts from this page to our collection
      const posts = response.data.data || [];
      allPosts.push(...posts);
      console.log(`  Retrieved ${posts.length} posts (total so far: ${allPosts.length})`);

      // Check if there's a next page
      nextUrl = response.data.paging?.next || null;

      // Break if no more posts on this page
      if (posts.length === 0) {
        console.log('  No more posts found, stopping pagination');
        break;
      }
    }

    if (pageCount >= maxPages && nextUrl) {
      console.log(`Reached maximum page limit (${maxPages}). There may be more posts available.`);
    }

    console.log(`Total Facebook posts retrieved: ${allPosts.length}`);

    res.json({
      success: true,
      posts: allPosts,
      metadata: {
        totalPosts: allPosts.length,
        pagesRetrieved: pageCount,
        hasMore: !!nextUrl
      }
    });
  } catch (error) {
    console.error('====== Facebook API Error ======');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response statusText:', error.response?.statusText);
    console.error('Response headers:', JSON.stringify(error.response?.headers || {}, null, 2));
    console.error('Response data:', JSON.stringify(error.response?.data || {}, null, 2));
    console.error('Request URL:', error.config?.url);
    console.error('Request method:', error.config?.method);
    console.error('================================');

    // Return detailed error to client
    const fbError = error.response?.data?.error;
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch Semper Admin posts',
      message: error.message,
      facebookError: fbError || null
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
    const prompt = buildSummaryPrompt(messageType, content);

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

// Feedback endpoint - Create GitHub issues from user feedback
app.post('/api/feedback', async (req, res) => {
  // Check if GitHub token is configured
  if (!GITHUB_TOKEN) {
    return res.status(503).json({
      success: false,
      error: 'Feedback service not configured',
      message: 'Server administrator must set GITHUB_TOKEN environment variable'
    });
  }

  try {
    const { type, title, description, email, context = {} } = req.body;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, and description are required'
      });
    }

    // Sanitize and truncate inputs
    const sanitizeString = (str) => {
      if (!str) return '';
      // Remove null bytes and control characters except newlines and tabs
      return String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    };

    const sanitizedTitle = sanitizeString(title).substring(0, 200); // GitHub limit is 256, leave room for prefix
    const sanitizedDescription = sanitizeString(description).substring(0, 50000); // GitHub body limit is 65536
    const sanitizedEmail = email ? sanitizeString(email).substring(0, 200) : '';

    // Format type for display
    const typeDisplay = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      ux: 'UX Suggestion'
    }[type] || 'Feedback';

    // Format the issue body
    // NOTE: Email is included in the public GitHub issue body. The frontend displays a privacy warning
    // to users before they submit. This is intentional to allow maintainers to follow up with users.
    const issueBody = `## User Feedback

**Type:** ${typeDisplay}

**Description:**
${sanitizedDescription}

${sanitizedEmail ? `**Contact:** ${sanitizedEmail}\n` : ''}
---

## Context (Auto-captured)
- **Browser:** ${sanitizeString(context.browser) || 'Unknown'}
- **Screen:** ${sanitizeString(context.screenResolution) || 'Unknown'}
- **Viewport:** ${sanitizeString(context.viewport) || 'Unknown'}
- **Current Tab:** ${sanitizeString(context.currentTab) || 'Unknown'}
- **Date Filter:** ${sanitizeString(context.dateFilter) || 'Unknown'}
- **Theme:** ${sanitizeString(context.theme) || 'Unknown'}
- **Timestamp:** ${sanitizeString(context.timestamp) || new Date().toISOString()}
- **URL:** ${sanitizeString(context.url) || 'Unknown'}

---
*This issue was automatically created via the in-app feedback widget.*`;

    const issueTitle = `[${typeDisplay.toUpperCase()}] ${sanitizedTitle}`;

    console.log('Creating GitHub issue:', {
      repo: GITHUB_REPO,
      titleLength: issueTitle.length,
      bodyLength: issueBody.length
    });

    // Create GitHub issue (without labels to avoid validation errors if labels don't exist)
    const response = await axios.post(
      `https://api.github.com/repos/${GITHUB_REPO}/issues`,
      {
        title: issueTitle,
        body: issueBody
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log(`✅ Feedback issue created: ${response.data.html_url}`);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      issueUrl: response.data.html_url,
      issueNumber: response.data.number
    });

  } catch (error) {
    console.error('GitHub API error:', error.message);

    // Log detailed error information for debugging
    if (error.response) {
      console.error('GitHub API Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data, null, 2)
      });

      // Check if it's a GitHub API error
      return res.status(error.response.status).json({
        success: false,
        error: 'Failed to create GitHub issue',
        message: error.response.data?.message || error.message,
        details: error.response.data?.errors || error.response.data
      });
    }

    // Other errors (network, timeout, etc.)
    console.error('Non-API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`GitHub debug: http://localhost:${PORT}/api/debug/github`);
  console.log(`ALNAV endpoint: http://localhost:${PORT}/api/alnav/2025`);
  console.log(`SECNAV endpoint: http://localhost:${PORT}/api/navy-directives`);
  console.log(`Facebook endpoint: http://localhost:${PORT}/api/facebook/semperadmin`);
  console.log(`AI Summaries endpoint: http://localhost:${PORT}/api/summaries`);
  console.log(`Save summary: POST http://localhost:${PORT}/api/summary`);
  console.log(`Get summary: GET http://localhost:${PORT}/api/summary/:messageKey`);
  console.log(`Feedback endpoint: POST http://localhost:${PORT}/api/feedback`);
});
