# Setting Up Automated Deployment to Render.com

This guide will help you set up automated deployments to Render.com using GitHub Actions.

## Prerequisites

✅ GitHub Secrets already configured:
- `YOUTUBE_API_KEY` - ✅ Set
- `GEMINI_API_KEY` - ✅ Set

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up/sign in with your GitHub account
3. This allows Render to access your repositories

## Step 2: Create New Web Service

1. From Render Dashboard, click **New +** → **Web Service**
2. Select **Build and deploy from a Git repository**
3. Click **Connect account** if needed
4. Find and select your repository: `SemperAdmin/usmc-directives-hub`
5. Click **Connect**

## Step 3: Configure Service Settings

On the service configuration page, enter:

### Basic Settings
- **Name:** `usmc-directives-proxy` (or your preferred name)
- **Region:** Choose closest to your users (e.g., Oregon USA, Ohio USA)
- **Branch:** `main` (or your production branch)
- **Root Directory:** `proxy-server`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Instance Type
- **Free** tier works for low traffic
- **Starter** ($7/month) for production (recommended)

## Step 4: Set Environment Variables

In the **Environment** section, add these variables:

| Key | Value | Source |
|-----|-------|--------|
| `YOUTUBE_API_KEY` | [your key] | Copy from GitHub Secrets |
| `GEMINI_API_KEY` | [your key] | Copy from GitHub Secrets |
| `YOUTUBE_CHANNEL_ID` | `UCob5u7jsXrdca9vmarYJ0Cg` | Default |
| `NODE_ENV` | `production` | Optional but recommended |

**How to get values from GitHub Secrets:**
1. Go to your repo → Settings → Secrets → Actions
2. You cannot view secret values directly
3. Either:
   - Use the original values you saved
   - Or regenerate new API keys at Google Cloud Console

## Step 5: Deploy

Click **Create Web Service**

Render will:
1. Clone your repository
2. Run `npm install` in the `proxy-server` directory
3. Start the server with `npm start`
4. Assign you a URL like: `https://usmc-directives-proxy.onrender.com`

**⏱️ First deployment takes 2-3 minutes**

## Step 6: Copy Your Service URL

Once deployed, you'll see your service URL. Copy it (e.g., `https://usmc-directives-proxy.onrender.com`)

## Step 7: Update Frontend

Update `app.js` in your repository:

```javascript
// Find this line (around line 72):
const CUSTOM_PROXY_URL = "";

// Replace with your Render URL:
const CUSTOM_PROXY_URL = "https://usmc-directives-proxy.onrender.com";
```

Commit and push this change.

## Step 8: Enable GitHub Actions (Optional)

For automated deployments via the GitHub Actions workflow:

### Option A: Auto-Deploy (Recommended - No Actions Needed)

Render has built-in GitHub integration that auto-deploys when you push to main:

1. In Render dashboard → Your service → Settings
2. **Auto-Deploy:** Should be enabled by default
3. Every push to `main` branch automatically triggers deployment
4. ✅ **This is already working - no GitHub Actions needed!**

### Option B: Manual Deploy via GitHub Actions

If you want to use the GitHub Actions workflow for more control:

1. Get your Render API Key:
   - Go to Account Settings → API Keys
   - Click **Create API Key**
   - Copy the key

2. Get your Service ID:
   - Go to your service dashboard
   - Look at the URL: `https://dashboard.render.com/web/srv-XXXXX`
   - The `srv-XXXXX` part is your Service ID

3. Add GitHub Secrets:
   - Go to your repo → Settings → Secrets → Actions
   - Click **New repository secret**
   - Add:
     - Name: `RENDER_API_KEY`, Value: [your API key]
     - Name: `RENDER_SERVICE_ID`, Value: [your service ID]

4. The workflow will now automatically deploy on push to main

## Step 9: Test Your Deployment

### Test the proxy server:

```bash
# Replace with your Render URL
RENDER_URL="https://usmc-directives-proxy.onrender.com"

# 1. Health check
curl $RENDER_URL/health

# Expected: {"status":"ok","timestamp":"..."}

# 2. Test YouTube API (requires YOUTUBE_API_KEY)
curl "$RENDER_URL/api/youtube/videos?maxResults=5"

# Expected: {"items":[...]} with YouTube video data

# 3. Test Gemini API (requires GEMINI_API_KEY)
curl -X POST $RENDER_URL/api/gemini/summarize \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message","messageType":"maradmin"}'

# Expected: {"success":true,"summary":"..."}
```

### Common Issues:

❌ **503 Error on /api/youtube or /api/gemini:**
- Check Environment Variables in Render dashboard
- Make sure `YOUTUBE_API_KEY` and `GEMINI_API_KEY` are set
- Restart the service after adding variables

❌ **Build Failed:**
- Check Logs in Render dashboard
- Make sure `package.json` has all dependencies
- Verify Node version compatibility

❌ **Service Won't Start:**
- Check if port 3000 is hardcoded (Render uses dynamic ports)
- Use `process.env.PORT || 3000` in server.js ✅ (already done)

## Step 10: Monitor Your Service

### Render Dashboard:
- **Logs:** View real-time logs
- **Metrics:** CPU, memory usage
- **Events:** Deployment history

### Enable Notifications:
1. Service Settings → Notifications
2. Add email or Slack webhook
3. Get alerted on deployment failures

## Free Tier Limitations

Render's free tier has some limitations:

⚠️ **Spin Down After Inactivity:**
- Free services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Subsequent requests are fast

**Solutions:**
1. **Upgrade to Starter plan** ($7/month) - no sleep
2. **Use a ping service** - Keep it awake (UptimeRobot, etc.)
3. **Accept the delay** - OK for low-traffic apps

⚠️ **750 hours/month:**
- Enough for one service running 24/7
- Multiple services share this quota

## Troubleshooting

### Deployment Failed

Check the deployment logs in Render:
1. Go to your service → Logs
2. Look for errors during build or startup
3. Common issues:
   - Missing dependencies: Add to `package.json`
   - Wrong Node version: Specify in `package.json` engines
   - Port issues: Should use `process.env.PORT`

### Environment Variables Not Working

1. Verify variables are set in Render dashboard (Environment tab)
2. Click "Manual Deploy" to trigger a new deployment
3. Check logs for startup messages about missing keys

### Still Getting Errors?

1. Check server logs: `console.error` messages
2. Test locally first:
   ```bash
   cd proxy-server
   export YOUTUBE_API_KEY="your_key"
   export GEMINI_API_KEY="your_key"
   npm start
   ```
3. If it works locally, issue is in Render configuration

## Next Steps

1. ✅ Service deployed and running
2. ✅ Environment variables configured
3. ✅ Updated CUSTOM_PROXY_URL in app.js
4. Test the frontend - AI summaries should work!
5. Monitor logs for any errors
6. Consider upgrading to Starter plan for production

## Support

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com/
- **GitHub Issues:** https://github.com/SemperAdmin/usmc-directives-hub/issues

---

**Last Updated:** 2025-10-30
**Status:** Render deployment enabled with GitHub Actions workflow
