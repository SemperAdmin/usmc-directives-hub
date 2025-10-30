const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for your GitHub Pages site
app.use(cors({
  origin: ['https://semperadmin.github.io', 'http://localhost:8000'],
  methods: ['GET', 'POST', 'PUT'],
  credentials: true
}));

// Enable JSON body parsing
app.use(express.json());

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
