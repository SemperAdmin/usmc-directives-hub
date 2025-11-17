# YouTube API 403 Error - Diagnostic & Fix Guide

> **Note**: This is a deep-dive guide specifically for **403 Forbidden** errors. For general YouTube API troubleshooting (including 503 errors, missing API keys, or quota issues), see [YOUTUBE-API-TROUBLESHOOTING.md](./YOUTUBE-API-TROUBLESHOOTING.md).

## Error Details

```
YouTube API error (403): {
  "success": false,
  "error": "Failed to fetch YouTube videos",
  "message": "Request failed with status code 403"
}
```

## What This Means

- ✅ `YOUTUBE_API_KEY` **IS configured** in Render (if it wasn't, you'd get HTTP 503)
- ❌ YouTube API is **rejecting the request** with HTTP 403

## Root Causes & Fixes

### 1. API Key Has Application Restrictions (Most Common) 🔴

**Problem**: The API key is restricted to specific domains/referrers, and the Render server URL is not allowed.

**How to Check**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your API key
4. Check **Application restrictions** section

**Common Misconfiguration**:
```
Application restrictions: HTTP referrers (websites)
Allowed referrers:
  - https://semperadmin.github.io/*  ✅ Frontend allowed
  - (Missing Render URL)  ❌ Backend blocked
```

**Fix**:
1. In the API key settings, find **Application restrictions**
2. Change to **"None"** (temporarily for testing)
3. Click **Save**
4. Wait 1-2 minutes for changes to propagate
5. Test the app again

**Permanent Fix** (After testing works):
1. Change **Application restrictions** to: **HTTP referrers (websites)**
2. Add these referrers:
   ```
   https://semperadmin.github.io/*
   https://usmc-directives-proxy.onrender.com/*
   https://*.onrender.com/*
   ```
3. Click **Save**

**Note**: Server-to-server requests (Render → YouTube) should ideally use **IP addresses** restriction or **None**, not HTTP referrers.

---

### 2. YouTube Data API v3 Not Enabled 🔴

**Problem**: The API is not enabled for your Google Cloud project.

**How to Check**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Dashboard**
3. Look for "YouTube Data API v3" in enabled APIs list

**Fix**:
1. Navigate to: **APIs & Services** → **Library**
2. Search: "YouTube Data API v3"
3. Click on the API
4. Click **Enable**
5. Wait 1-2 minutes
6. Test again

---

### 3. API Key Invalid or Expired 🟡

**Problem**: The API key in Render is wrong, expired, or from a deleted project.

**How to Check**:
Test the API key directly with curl:

```bash
# Replace YOUR_API_KEY with the actual key from Render
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCob5u7jsXrdca9vmarYJ0Cg&maxResults=5&key=YOUR_API_KEY"
```

**Expected Responses**:
- ✅ **Success**: Returns JSON with `"items": [...]`
- ❌ **403 with "keyInvalid"**: API key is wrong
- ❌ **403 with "accessNotConfigured"**: YouTube API not enabled
- ❌ **403 with "quotaExceeded"**: Hit daily limit

**Fix**:
1. Create a new API key in Google Cloud Console
2. Update `YOUTUBE_API_KEY` in Render environment variables
3. Save and wait for auto-redeploy
4. Test again

---

### 4. Quota Exceeded 🟡

**Problem**: You've exceeded the daily quota of 10,000 units.

**How to Check**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Dashboard**
3. Click on **YouTube Data API v3**
4. View quota usage

**Quota Costs**:
- Each search request: **100 units**
- Your app fetches: 20 pages × 100 units = **2,000 units per load**
- Daily limit: **10,000 units** = ~5 loads per day

**Fix Options**:
1. **Wait**: Quota resets daily at midnight Pacific Time
2. **Request increase**: In Google Cloud Console, request higher quota (usually approved quickly)
3. **Reduce fetches**: Lower `maxPages` in app.js line 813

---

## Step-by-Step Fix (Recommended)

### Option 1: Remove Application Restrictions (Quickest)

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials

2. **Find Your API Key**
   - Look in the "API Keys" section
   - Click on the key name

3. **Edit Application Restrictions**
   - Find: "Application restrictions"
   - Select: **None**
   - Click: **Save**

4. **Wait 2 Minutes**
   - Changes take time to propagate

5. **Test**
   - Refresh your app
   - Check browser console
   - Should see: "Total YouTube videos loaded: X"

### Option 2: Add Render to Allowed Referrers

If you want to keep restrictions:

1. **Edit API Key** (same as above)

2. **Set Application Restrictions**
   - Select: "HTTP referrers (websites)"
   - Click: **Add an item**
   - Add these URLs:
     ```
     https://semperadmin.github.io/*
     https://usmc-directives-proxy.onrender.com/*
     https://*.onrender.com/*
     ```

3. **Click Save**

4. **Wait 2 Minutes & Test**

---

## Testing the Fix

### Method 1: Direct API Test

Test if the API key works:

```bash
# Get your API key from Render Dashboard
# Environment tab → YOUTUBE_API_KEY → Click to reveal

# Test with curl
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCob5u7jsXrdca9vmarYJ0Cg&maxResults=5&key=YOUR_API_KEY"
```

**Success Response**:
```json
{
  "items": [
    {
      "kind": "youtube#searchResult",
      "id": { "videoId": "..." },
      "snippet": { "title": "...", ... }
    }
  ]
}
```

### Method 2: Check Render Logs

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select: `usmc-directives-proxy`
3. Click: **Logs**
4. Look for YouTube API requests
5. Check for error details

### Method 3: Browser Console

1. Open: https://semperadmin.github.io/usmc-directives-hub/
2. Press: **F12** → **Console** tab
3. Refresh page
4. Look for:
   - ✅ `"Total YouTube videos loaded: X"` → Working!
   - ❌ `"YouTube API error (403):"` → Still broken

---

## Common Error Messages Explained

### "Request failed with status code 403"
**Generic 403** - Check all causes above

### "The request cannot be completed because you have exceeded your quota"
**Quota exceeded** - Wait for reset or request increase

### "API key not valid"
**Invalid key** - Create new API key and update Render

### "YouTube Data API has not been used in project"
**API not enabled** - Enable YouTube Data API v3 in Google Cloud

### "The referrer does not match the referrer restrictions"
**Referrer restriction** - Add Render URL or remove restrictions

---

## Quick Checklist

Run through this checklist:

- [ ] Is `YOUTUBE_API_KEY` set in Render? (Check Environment tab)
- [ ] Is YouTube Data API v3 enabled in Google Cloud?
- [ ] Are application restrictions set to "None" or include Render URL?
- [ ] Is the API key valid (test with curl)?
- [ ] Is quota under 10,000 units/day?
- [ ] Have you waited 2 minutes after making changes?

---

## Still Not Working?

### Get Detailed Error from Render

1. Go to Render Dashboard → Logs
2. Look for lines starting with: `"YouTube API error:"`
3. Copy the full error response
4. Check the `error.message` and `error.code` fields

### Common Error Codes

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `keyInvalid` | API key is wrong | Create new key |
| `accessNotConfigured` | API not enabled | Enable YouTube Data API v3 |
| `quotaExceeded` | Hit daily limit | Wait or request increase |
| `forbidden` | Permission denied | Check API restrictions |
| `rateLimitExceeded` | Too many requests | Wait 1 minute |

---

## Prevention

### Best Practices

1. **No Application Restrictions** (for server-to-server)
   - Render server → YouTube API doesn't need referrer restrictions
   - Use **None** or **IP addresses** (if static IP available)

2. **Monitor Quota**
   - Check daily in Google Cloud Console
   - Set up alerts if approaching limit

3. **Keep API Key Secret**
   - Never commit to GitHub
   - Store only in Render environment variables
   - Rotate periodically

4. **Test Changes**
   - After updating API key in Render
   - Wait 2 minutes for deployment
   - Check Render logs for confirmation

---

## Summary

**Your 403 Error** indicates the API key exists but YouTube is blocking it.

**Most Likely Fix**:
1. Go to Google Cloud Console
2. Edit your API key
3. Set Application restrictions to **"None"**
4. Save and wait 2 minutes
5. Test again

If that doesn't work, ensure YouTube Data API v3 is enabled.

---

**Last Updated**: 2025-11-17
**Related Docs**: YOUTUBE-API-TROUBLESHOOTING.md
