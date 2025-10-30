# GitHub Actions Workflows

This directory contains automated deployment workflows for the USMC Directives Hub.

## Available Workflows

### 1. `deploy-proxy-server.yml`
Automatically deploys the proxy server when changes are pushed to the main branch.

**Triggers:**
- Push to `main` or `master` branch (when `proxy-server/` files change)
- Manual trigger via GitHub Actions UI

**Required GitHub Secrets:**
These secrets must be configured in your repository settings:

#### API Keys (CRITICAL - Already configured)
- `YOUTUBE_API_KEY` - Your YouTube Data API v3 key ✅ Set
- `GEMINI_API_KEY` - Your Google Gemini API key ✅ Set

#### Deployment Secrets (Optional - depends on hosting)
Choose ONE deployment method and configure its secrets:

**For Render.com:**
- `RENDER_API_KEY` - Your Render API key
- `RENDER_SERVICE_ID` - Your Render service ID

**For Heroku:**
- `HEROKU_API_KEY` - Your Heroku API key
- Set `HEROKU_APP_NAME` in the workflow

**For Custom Server (SSH):**
- `SSH_PRIVATE_KEY` - Private SSH key for deployment
- `SERVER_HOST` - Server hostname or IP
- `SERVER_USER` - SSH username

## How GitHub Secrets Work

### Setting Secrets
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add name and value
5. Click **Add secret**

### Using Secrets in Workflows
```yaml
env:
  YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

### Security Best Practices
✅ Secrets are encrypted and never exposed in logs
✅ Only accessible to workflows in the repository
✅ Cannot be read by pull requests from forks
❌ Never print secrets to logs (GitHub will mask them, but avoid it)
❌ Never commit `.env` files with real API keys

## Quick Start: Deploy to Render.com

Render.com is the easiest deployment option and can use GitHub Secrets directly.

### Step 1: Create Render Service
1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** usmc-directives-proxy
   - **Root Directory:** `proxy-server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Step 2: Set Environment Variables in Render
In your Render service dashboard, go to **Environment** and add:
```
YOUTUBE_API_KEY = [from GitHub Secret]
GEMINI_API_KEY = [from GitHub Secret]
YOUTUBE_CHANNEL_ID = UCob5u7jsXrdca9vmarYJ0Cg
```

**Option A:** Copy values from GitHub Secrets manually
**Option B:** Use Render's GitHub integration (automatically syncs)

### Step 3: Enable Auto-Deploy
Render will automatically deploy when you push to the main branch. No GitHub Actions workflow needed!

### Step 4: Update CUSTOM_PROXY_URL
Once deployed, copy your Render URL (e.g., `https://usmc-directives-proxy.onrender.com`) and update it in `app.js`:

```javascript
const CUSTOM_PROXY_URL = "https://usmc-directives-proxy.onrender.com";
```

## Alternative: Manual Deployment Without GitHub Actions

If you don't want to use GitHub Actions, you can deploy manually:

### Option 1: Direct to Hosting Provider
Most hosting providers (Render, Heroku, Railway) can deploy directly from GitHub without Actions.

### Option 2: Local Deployment
```bash
cd proxy-server

# Set environment variables locally
export YOUTUBE_API_KEY="your_key_here"
export GEMINI_API_KEY="your_key_here"

# Install and start
npm install
npm start
```

### Option 3: Using .env File (Development Only)
```bash
# Create .env file (NEVER commit this)
cat > .env << EOF
YOUTUBE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
YOUTUBE_CHANNEL_ID=UCob5u7jsXrdca9vmarYJ0Cg
EOF

chmod 600 .env

# Install dotenv package
npm install dotenv

# Update server.js to load .env:
# require('dotenv').config();

npm start
```

## Monitoring Deployments

### Check Workflow Status
- Go to **Actions** tab in your repository
- View recent workflow runs
- Check logs for any errors

### Test Deployment
After deployment, test your endpoints:

```bash
# Health check
curl https://your-server.com/health

# Test YouTube endpoint (requires API key)
curl https://your-server.com/api/youtube/videos?maxResults=5

# Test Gemini endpoint (requires API key)
curl -X POST https://your-server.com/api/gemini/summarize \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message","messageType":"maradmin"}'
```

## Troubleshooting

### Error: "API key not configured"
**Cause:** Environment variables not set in hosting environment
**Fix:** Add `YOUTUBE_API_KEY` and `GEMINI_API_KEY` to your hosting provider's environment variables

### Error: "GitHub Secret not found"
**Cause:** Secret not added to repository
**Fix:** Go to Settings → Secrets → Actions → Add the secret

### Error: "Workflow failed"
**Cause:** Various reasons
**Fix:** Check the Actions tab for detailed logs

### API Keys Not Working
**Check:**
1. Secrets are correctly named (exact match)
2. Values don't have extra spaces or quotes
3. Hosting provider has environment variables set
4. API keys are valid and not expired

## Support

For issues with:
- **GitHub Actions:** Check [GitHub Actions docs](https://docs.github.com/en/actions)
- **Render:** Check [Render docs](https://render.com/docs)
- **Heroku:** Check [Heroku docs](https://devcenter.heroku.com/)
- **API Keys:** Regenerate at [Google Cloud Console](https://console.cloud.google.com/)
