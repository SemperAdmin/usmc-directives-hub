# Cloudflare Worker Proxy

This is a serverless alternative to the Node.js proxy server. It runs on Cloudflare's edge network (free tier available).

## Advantages

- **Free**: 100,000 requests/day on free tier
- **Fast**: Runs on Cloudflare's global edge network
- **No server maintenance**: Fully serverless
- **Automatic scaling**: Handles traffic spikes

## Deployment Steps

### 1. Create Cloudflare Account

Sign up at https://workers.cloudflare.com

### 2. Install Wrangler CLI (Optional)

```bash
npm install -g wrangler
wrangler login
```

### 3. Deploy via Dashboard (Easiest)

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Click "Create Application"
4. Click "Create Worker"
5. Name it: `usmc-directives-proxy`
6. Copy the contents of `worker.js` into the editor
7. Click "Save and Deploy"

### 4. Deploy via CLI (Alternative)

```bash
cd cloudflare-worker
wrangler init usmc-directives-proxy
# Copy worker.js to the project
wrangler deploy
```

## Get Your Worker URL

After deployment, your worker will be available at:
```
https://usmc-directives-proxy.<your-subdomain>.workers.dev
```

## Update Frontend

In your `app.js`, add at the top:

```javascript
const PROXY_URL = 'https://usmc-directives-proxy.<your-subdomain>.workers.dev';
```

## Testing

Test your worker:
```bash
# Health check
curl https://usmc-directives-proxy.<your-subdomain>.workers.dev/health

# ALNAV
curl https://usmc-directives-proxy.<your-subdomain>.workers.dev/api/alnav/2025

# SECNAV
curl https://usmc-directives-proxy.<your-subdomain>.workers.dev/api/navy-directives
```

## Cost

- **Free Tier**: 100,000 requests/day
- **Paid Tier**: $5/month for 10 million requests

For this use case, free tier should be sufficient.

## Configuration

To update allowed origins, edit the `ALLOWED_ORIGINS` array in `worker.js`:

```javascript
const ALLOWED_ORIGINS = [
  'https://semperadmin.github.io',
  'http://localhost:8000',
  // Add your custom domain if needed
];
```

## Limitations

Cloudflare Workers have:
- 50ms CPU time limit (free tier)
- 128MB memory limit
- 30 second timeout for subrequests

These limits are sufficient for proxying HTML pages.
