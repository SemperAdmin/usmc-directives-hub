# YouTube API Troubleshooting Guide

## Problem: "No YouTube Videos Showing"

If the YouTube tab shows 0 videos or no results, the YouTube API integration is not working.

## Root Causes

The YouTube API requires a Google Cloud API key to fetch videos. Common issues:

### 1. **Missing API Key** (Most Common) ❌

**Symptoms:**
- YouTube tab shows 0 videos
- Browser console: `YouTube API error (503): YouTube API key not configured`
- Render logs: `❌ CRITICAL: YOUTUBE_API_KEY environment variable is not set`

**Fix:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select `usmc-directives-proxy` service
3. Click **Environment** tab
4. Add environment variable:
   - **Key**: `YOUTUBE_API_KEY`
   - **Value**: [Your Google Cloud API Key]
5. Click **Save Changes** (auto-redeploys)

### 2. **Invalid/Expired API Key** ❌

**Symptoms:**
- YouTube tab shows 0 videos
- Browser console: `YouTube API error (403): The request cannot be completed...`
- Google API returns: `"error": "invalid_api_key"` or similar

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Find your API key and check:
   - **Status**: Should be "Enabled"
   - **API restrictions**: Should include "YouTube Data API v3"
   - **Application restrictions**: Should allow requests from:
     - `https://semperadmin.github.io/*`
     - `https://usmc-directives-proxy.onrender.com/*`
4. If invalid, create a new API key (see below)

### 3. **Quota Exceeded** ⚠️

**Symptoms:**
- YouTube works initially, then stops
- Browser console: `YouTube API error (403): quotaExceeded`
- Google API returns: `"reason": "quotaExceeded"`

**Understanding Quota:**
- Default quota: **10,000 units/day**
- Each search request: **100 units**
- Your app fetches: 20 pages × 100 units = **2,000 units per load**
- Max loads per day: **~5 times**

**Fix:**
1. Check quota usage:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: APIs & Services → Dashboard
   - Select: YouTube Data API v3
   - View: Quota usage
2. Options:
   - **Wait**: Quota resets daily at midnight Pacific Time
   - **Reduce**: Lower `maxPages` in `app.js` line 813
   - **Upgrade**: Request quota increase in Google Cloud Console

### 4. **Render Free Tier Spin-Down** ⏱️

**Symptoms:**
- First load after inactivity takes 30-60 seconds
- Browser console: Network timeout or connection error
- Works fine after first request

**Fix:**
1. **Wait**: First request wakes up the service (30-60 seconds)
2. **Upgrade**: Render Starter plan ($7/month) - no sleep
3. **Ping service**: Use UptimeRobot to keep service awake

---

## How to Get a YouTube API Key

### Step-by-Step Guide

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click project dropdown (top left)
   - Click "New Project"
   - Name: "USMC Directives Hub" (or any name)
   - Click "Create"

3. **Enable YouTube Data API v3**
   - Navigate to: **APIs & Services** → **Library**
   - Search: "YouTube Data API v3"
   - Click on the API
   - Click **Enable**

4. **Create API Key**
   - Navigate to: **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the key immediately (you'll need it)
   - ⚠️ **IMPORTANT**: Never commit this key to GitHub!

5. **Restrict the API Key** (Recommended)
   - Click on the key you just created
   - **API restrictions**:
     - Select "Restrict key"
     - Check: ✅ YouTube Data API v3
   - **Application restrictions**:
     - Select "HTTP referrers (websites)"
     - Add referrers:
       - `https://semperadmin.github.io/*`
       - `https://usmc-directives-proxy.onrender.com/*`
   - Click **Save**

6. **Add to Render Environment**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Select your service
   - Environment tab → Add:
     - **Key**: `YOUTUBE_API_KEY`
     - **Value**: [Paste your API key]
   - Save (auto-redeploys)

---

## Testing the Fix

### Method 1: Run Diagnostic Script

From your repository:

```bash
# Make executable
chmod +x scripts/test-youtube-api.sh

# Run diagnostic
./scripts/test-youtube-api.sh
```

### Method 2: Manual Testing

**Test 1: Render Health Check**
```bash
curl https://usmc-directives-proxy.onrender.com/health
```
Expected: `{"status":"ok","timestamp":"..."}`

**Test 2: YouTube API Endpoint**
```bash
curl "https://usmc-directives-proxy.onrender.com/api/youtube/videos?maxResults=5"
```
- ✅ **Success**: Returns JSON with `"items": [...]`
- ❌ **503 Error**: API key not configured
- ❌ **403 Error**: API key invalid or quota exceeded

**Test 3: Browser Console**
1. Open: https://semperadmin.github.io/usmc-directives-hub/
2. Open Developer Tools (F12) → Console
3. Refresh the page
4. Look for:
   - ✅ `"Total YouTube videos loaded: X"` → Working!
   - ❌ `"YouTube API error (503):"` → API key not set
   - ❌ `"YouTube API error (403):"` → API key invalid/quota

### Method 3: Check UI

1. Open the app: https://semperadmin.github.io/usmc-directives-hub/
2. Click the **YouTube** tab
3. Check the counter badge:
   - ✅ Shows number > 0 (e.g., "125")
   - ❌ Shows 0 or nothing

---

## Architecture Overview

Understanding the data flow helps with troubleshooting:

```
User Browser (semperadmin.github.io)
  ↓ fetch()
  ↓
Render Proxy Server (usmc-directives-proxy.onrender.com)
  ↓ /api/youtube/videos
  ↓ axios.get()
  ↓ Uses YOUTUBE_API_KEY env var
  ↓
Google YouTube Data API v3
  ↓ https://www.googleapis.com/youtube/v3/search
  ↓
Returns video data
  ↓
Displayed in app (app.js fetchYouTubeVideos())
```

**Key Files:**
- `app.js` (lines 806-898): Frontend fetch logic
- `proxy-server/server.js` (lines 314-355): Backend API endpoint
- `.github/workflows/RENDER-SETUP.md`: Environment setup guide

---

## Quota Management

### Understanding Costs

YouTube Data API v3 uses a quota system:

| Operation | Cost (units) |
|-----------|--------------|
| Search API call | 100 |
| Video details | 1 |
| Channel info | 1 |

**Your App Usage:**
- Fetches up to 20 pages of results
- Each page = 1 search call = 100 units
- Total per load: **2,000 units**
- With 10,000 daily quota: **~5 loads per day**

### Reducing Quota Usage

**Option 1: Reduce Pages** (app.js line 813)
```javascript
const maxPages = 5; // Was: 20 (reduces to 500 units/load)
```

**Option 2: Cache Results** (Already Implemented)
- App caches videos in localStorage
- Only fetches on first load or manual refresh
- Cache expires after 24 hours

**Option 3: Request Quota Increase**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → YouTube Data API v3
3. Quotas → Request increase
4. Free to request, usually approved within 24 hours

---

## Common Error Messages

### "YouTube API key not configured"
**HTTP 503 from proxy server**

**Cause**: `YOUTUBE_API_KEY` environment variable not set in Render

**Fix**: Add the environment variable (see above)

---

### "quotaExceeded"
**HTTP 403 from Google API**

**Cause**: Exceeded 10,000 units/day quota

**Fix**:
- Wait for quota reset (midnight Pacific Time)
- Reduce page fetches
- Request quota increase

---

### "API key not valid"
**HTTP 400 from Google API**

**Cause**: Invalid API key or wrong restrictions

**Fix**:
- Verify key in Google Cloud Console
- Check API restrictions (must include YouTube Data API v3)
- Check application restrictions (must allow Render URL)

---

### "Access denied" (CORS)
**When testing with curl**

**Cause**: CORS protection - proxy only allows requests from:
- `https://semperadmin.github.io`
- `http://localhost:8000`
- `http://127.0.0.1:8000`

**Fix**: This is **expected behavior**. Test from browser instead.

---

## Monitoring

### Render Logs

View real-time logs:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service
3. Click **Logs** tab
4. Look for:
   - `❌ CRITICAL: YOUTUBE_API_KEY environment variable is not set`
   - `YouTube API error:` messages

### Google Cloud Monitoring

Monitor API usage:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Dashboard
3. YouTube Data API v3
4. View:
   - Requests per day
   - Quota usage
   - Error rates

---

## Getting Help

### Check These First:
1. ✅ Is `YOUTUBE_API_KEY` set in Render?
2. ✅ Is the API key valid in Google Cloud Console?
3. ✅ Is YouTube Data API v3 enabled?
4. ✅ Have you exceeded quota?
5. ✅ Is Render service running (not sleeping)?

### Still Having Issues?

1. **Run diagnostic**: `./scripts/test-youtube-api.sh`
2. **Check browser console**: F12 → Console tab
3. **Check Render logs**: Dashboard → Logs
4. **Test API key directly**:
   ```bash
   curl "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCob5u7jsXrdca9vmarYJ0Cg&maxResults=5&key=YOUR_API_KEY"
   ```

### Resources:
- **YouTube API Docs**: https://developers.google.com/youtube/v3
- **Render Docs**: https://render.com/docs
- **GitHub Issues**: https://github.com/SemperAdmin/usmc-directives-hub/issues

---

**Last Updated**: 2025-11-17
**Status**: Active troubleshooting guide
