# USMC Directives Hub - Proxy Server

This proxy server solves CORS issues when fetching ALNAV and SECNAV/OPNAV directives from Navy websites.

## Why is this needed?

Navy websites block cross-origin requests (CORS) from browser-based applications. This proxy server:
- Runs on your server (no CORS restrictions)
- Fetches the Navy websites server-side
- Returns the data with proper CORS headers to your frontend

## Installation

```bash
cd proxy-server
npm install
```

## Running Locally

```bash
npm start
```

The server will run on `http://localhost:3000`

## Endpoints

### Health Check
```
GET /health
```

### ALNAV Messages
```
GET /api/alnav/:year
Example: GET /api/alnav/2025
```

### SECNAV/OPNAV Directives
```
GET /api/navy-directives
```

### Generic Proxy (Restricted to Navy domains)
```
GET /api/proxy?url=<encoded-url>
Example: GET /api/proxy?url=https://www.mynavyhr.navy.mil/...
```

## Deployment Options

### Option 1: Deploy to Render.com (Free)

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `proxy-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Click "Create Web Service"

Your proxy will be available at: `https://your-app-name.onrender.com`

### Option 2: Deploy to Railway.app (Free)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add these settings:
   - **Root Directory**: `proxy-server`
   - **Start Command**: `npm start`
5. Deploy

### Option 3: Deploy to Heroku

```bash
# Install Heroku CLI
heroku login
heroku create usmc-directives-proxy

# Deploy
git subtree push --prefix proxy-server heroku main
```

### Option 4: Run on Your Own Server

If you have access to a server (especially on a military network):

```bash
# Install Node.js 18+
# Clone repository
git clone https://github.com/SemperAdmin/usmc-directives-hub.git
cd usmc-directives-hub/proxy-server
npm install

# Run with PM2 for production
npm install -g pm2
pm2 start server.js --name usmc-proxy
pm2 startup
pm2 save

# Configure reverse proxy (nginx/apache) if needed
```

## Update Frontend to Use Proxy

After deploying, update `app.js` to use your proxy URL:

```javascript
// At the top of app.js, add:
const PROXY_URL = 'https://your-proxy-url.onrender.com';

// Update ALNAV fetch function:
async function fetchAlnavPage(url) {
  const year = url.match(/ALNAV-(\d{4})/)?.[1] || '2025';
  const proxyUrl = `${PROXY_URL}/api/alnav/${year}`;

  const response = await fetch(proxyUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return parseAlnavLinks(doc, url);
}

// Update SECNAV fetch function:
async function fetchSecnavPage(url) {
  const proxyUrl = `${PROXY_URL}/api/navy-directives`;

  const response = await fetch(proxyUrl);
  const text = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return parseSecnavLinks(doc, url);
}
```

## Security Notes

- The proxy only allows whitelisted Navy domains
- No sensitive data is logged
- Rate limiting should be added for production
- Consider adding authentication if deployed publicly

## Troubleshooting

### SSL Certificate Errors
Some Navy sites have SSL issues. The proxy disables SSL verification - this is acceptable for internal use but should be reviewed for production.

### Timeout Errors
Navy sites can be slow. The timeout is set to 30 seconds. Increase if needed:
```javascript
timeout: 60000 // 60 seconds
```

### Authentication Required
If Navy sites require CAC authentication, this proxy must be deployed on a military network with proper access.
