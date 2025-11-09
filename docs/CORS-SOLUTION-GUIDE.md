# CORS Solution Guide for Navy Directives Access

## Problem Summary

The Navy websites (`mynavyhr.navy.mil` and `secnav.navy.mil`) block cross-origin requests (CORS) from browser-based applications like your GitHub Pages site. This prevents the app from fetching ALNAV and SECNAV/OPNAV directives.

### Current Status:
- ✅ **MARADMIN** - Working (RSS feed)
- ✅ **MCPUB** - Working (RSS feed)
- ✅ **ALMAR** - Working (RSS feed)
- ✅ **SEMPERADMIN** - Working (RSS feed)
- ✅ **YouTube** - Working (API)
- ✅ **DoD Forms** - Working (scraping)
- ✅ **DoD FMR** - Working (scraping)
- ❌ **ALNAV** - CORS blocked or page structure issue
- ❌ **SECNAV/OPNAV** - CORS blocked

## Solutions

I've created three different solutions for you to choose from:

### Option 1: Deploy Backend Proxy Server (Recommended)

**Best for**: Production use, reliability, full control

A Node.js/Express server that fetches Navy sites server-side and returns data with proper CORS headers.

**Location**: `proxy-server/`

**Quick Start**:
```bash
cd proxy-server
npm install
npm start
```

**Deployment Options**:
1. **Render.com** (Free tier) - See `proxy-server/README.md`
2. **Railway.app** (Free tier)
3. **Heroku** ($5-7/month)
4. **Your own server** (Best for military network access)
5. **Docker** - Use included Dockerfile

**After deployment**, update `app.js`:
```javascript
const CUSTOM_PROXY_URL = "https://your-app.onrender.com";
```

---

### Option 2: Cloudflare Workers (Serverless)

**Best for**: Zero maintenance, global edge performance

A serverless function that runs on Cloudflare's edge network.

**Location**: `cloudflare-worker/`

**Advantages**:
- ✅ Free tier: 100,000 requests/day
- ✅ No server to maintain
- ✅ Global edge network (fast)
- ✅ Auto-scaling

**Deployment**:
1. Sign up at https://workers.cloudflare.com
2. Create new worker
3. Copy contents of `cloudflare-worker/worker.js`
4. Deploy

**After deployment**, update `app.js`:
```javascript
const CUSTOM_PROXY_URL = "https://usmc-directives-proxy.your-subdomain.workers.dev";
```

See `cloudflare-worker/README.md` for detailed instructions.

---

### Option 3: GitHub Actions (Automated Data Fetch)

**Best for**: Avoiding proxy servers entirely, periodic updates

A GitHub Actions workflow that fetches Navy data every 6 hours and commits it as JSON files.

**Location**: `proxy-server/github-actions-workflow.yml`

**How it works**:
1. GitHub Actions runs every 6 hours
2. Fetches ALNAV and SECNAV data server-side
3. Commits data as JSON files to repository
4. Frontend loads from JSON files instead of live scraping

**Setup**:
1. Copy `proxy-server/github-actions-workflow.yml` to `.github/workflows/fetch-navy-data.yml`
2. Commit and push the workflow file
3. Enable GitHub Actions in your repository settings
4. Manually trigger first run: Actions → "Fetch Navy Directives Data" → "Run workflow"

**Advantages**:
- ✅ No proxy server needed
- ✅ No external dependencies
- ✅ Free (GitHub Actions free tier)
- ✅ Cached data for faster loading

**Limitations**:
- ⚠️ Data updated every 6 hours (not real-time)
- ⚠️ Requires updating frontend to load from JSON files

---

## Comparison Table

| Solution | Cost | Complexity | Maintenance | Speed | Real-time | Reliability |
|----------|------|------------|-------------|-------|-----------|-------------|
| **Backend Proxy** | Free-$7/mo | Medium | Medium | Fast | Yes | High |
| **Cloudflare Workers** | Free | Low | None | Very Fast | Yes | Very High |
| **GitHub Actions** | Free | Low | None | Cached | No | High |

---

## Recommended Approach

### For most users:
👉 **Start with Cloudflare Workers** (Option 2)
- Easiest to deploy
- Zero maintenance
- Free tier is generous
- Excellent performance

### If Cloudflare doesn't work:
👉 **Deploy Backend Proxy to Render.com** (Option 1)
- Free tier available
- Simple deployment
- Full control

### If you need CAC authentication:
👉 **Deploy Backend Proxy on military network** (Option 1)
- Run on server with CAC access
- Only option that will work if sites require authentication

---

## Testing After Deployment

1. **Clear your browser cache** (Ctrl+Shift+R)
2. **Open Developer Console** (F12)
3. **Click Refresh button**
4. **Check console logs** for:
   ```
   Using custom proxy for ALNAV: https://your-proxy.com/api/alnav/2025
   Custom proxy succeeded for ALNAV
   Using custom proxy for SECNAV/OPNAV: https://your-proxy.com/api/navy-directives
   Custom proxy succeeded for SECNAV/OPNAV
   ```

5. **Verify results**:
   - ALNAV should show > 0 links found
   - SECNAV/OPNAV should show > 0 directives loaded

---

## Alternative: Check if Sites Require Authentication

Before deploying a proxy, test if the Navy sites require CAC authentication:

1. Open these URLs in your browser:
   - https://www.mynavyhr.navy.mil/References/Messages/ALNAV-2025/
   - https://www.secnav.navy.mil/doni/Directives/Forms/Secnav%20Current.aspx

2. **If you see a login page or CAC prompt**:
   - You'll need to deploy the proxy on a military network
   - Public proxies won't work
   - Use Option 1 (Backend Proxy) on a server with CAC access

3. **If you can see the content**:
   - The sites are public but CORS-protected
   - Any of the three options will work
   - Cloudflare Workers (Option 2) is recommended

---

## Troubleshooting

### "All fetch attempts failed"
- The Navy sites may require CAC authentication
- Try accessing from a military network
- Deploy proxy server with military network access

### "Custom proxy failed"
- Check that `CUSTOM_PROXY_URL` is set correctly in `app.js`
- Verify your proxy is running: `curl https://your-proxy.com/health`
- Check proxy logs for errors

### "0 ALNAV links found"
- The page structure may have changed
- Try accessing the ALNAV URL directly in your browser
- Check if the page requires authentication

### SECNAV/OPNAV still showing 0
- SharePoint table structure may have changed
- The page may require authentication
- Check if the URL redirects to a login page

---

## Need Help?

1. Check proxy server logs for detailed error messages
2. Test endpoints manually:
   ```bash
   curl https://your-proxy.com/health
   curl https://your-proxy.com/api/alnav/2025
   curl https://your-proxy.com/api/navy-directives
   ```
3. Open GitHub issue with console output and error messages

---

## Summary

The Navy websites are blocking your app due to CORS policy. To fix this:

1. **Choose a solution** (Cloudflare Workers recommended)
2. **Deploy the proxy**
3. **Update `CUSTOM_PROXY_URL` in app.js**
4. **Test and verify**

All necessary code and deployment instructions are included in:
- `proxy-server/` - Backend proxy option
- `cloudflare-worker/` - Serverless option
- `proxy-server/github-actions-workflow.yml` - GitHub Actions option (copy to `.github/workflows/`)

Pick the one that works best for your needs!
