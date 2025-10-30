# Security Guide for USMC Directives Proxy Server

## API Keys and GitHub Secrets

### ✅ Current Status: API Keys Secured

All API keys have been **removed from the codebase** and are now managed via environment variables.

**What we changed:**
- ❌ REMOVED: Hardcoded API keys from `server.js`
- ✅ ADDED: Environment variable-only configuration
- ✅ ADDED: GitHub Repository Secrets for `YOUTUBE_API_KEY` and `GEMINI_API_KEY`
- ✅ ADDED: Validation checks that fail gracefully if keys are missing

### Using GitHub Secrets

GitHub Secrets are already configured in your repository:
- `YOUTUBE_API_KEY` - ✅ Set in repository secrets
- `GEMINI_API_KEY` - ✅ Set in repository secrets

**How to use them:**

#### Method 1: Render.com (Recommended - Easiest)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard:
   - `YOUTUBE_API_KEY`: Copy value from GitHub Secrets
   - `GEMINI_API_KEY`: Copy value from GitHub Secrets
4. Render will automatically deploy on push to main

#### Method 2: Heroku
```bash
# After setting up Heroku app
heroku config:set YOUTUBE_API_KEY="<value_from_github_secret>" --app your-app-name
heroku config:set GEMINI_API_KEY="<value_from_github_secret>" --app your-app-name
```

#### Method 3: Custom Server with GitHub Actions
Use the provided workflow at `.github/workflows/deploy-proxy-server.yml` which automatically injects secrets during deployment.

#### Method 4: Manual Deployment
```bash
# On your server
export YOUTUBE_API_KEY="value_here"
export GEMINI_API_KEY="value_here"
npm start
```

### Rotating API Keys

If you need to rotate (change) your API keys:

1. **Generate new keys** at Google Cloud Console
2. **Update GitHub Secrets:**
   - Go to repository Settings → Secrets → Actions
   - Click on secret name → Update secret
   - Paste new value
3. **Update hosting environment** (Render, Heroku, etc.)
4. **Restart your server** to load new keys

## File Permissions for AI Summaries

The `ai-summaries.json` file stores AI-generated summaries and may contain sensitive military information. Proper file permissions are critical.

### Recommended File Permissions

```bash
# Set restrictive permissions (owner read/write only)
chmod 600 ai-summaries.json

# Set proper ownership (replace 'username' with your server user)
chown username:username ai-summaries.json
```

### Production Deployment Checklist

1. **Set Environment Variables** (DO NOT commit these to Git):
   ```bash
   export YOUTUBE_API_KEY="your_youtube_key_here"
   export GEMINI_API_KEY="your_gemini_key_here"
   export YOUTUBE_CHANNEL_ID="UCob5u7jsXrdca9vmarYJ0Cg"
   ```

2. **Enable SSL/TLS** (currently disabled - CRITICAL):
   - Obtain proper SSL certificates
   - Update `server.js` to remove `rejectUnauthorized: false`
   - Use Let's Encrypt or your hosting provider's certificates

3. **Rate Limiting** (already implemented):
   - General API: 100 requests per 15 minutes
   - AI Summaries: 10 requests per minute
   - Adjust in `server.js` if needed

4. **File Security**:
   ```bash
   # Restrict access to summary storage
   chmod 700 proxy-server/
   chmod 600 ai-summaries.json
   ```

5. **Firewall Rules**:
   - Only expose port 3000 (or your configured PORT)
   - Restrict access to trusted IPs if possible

6. **CORS Configuration**:
   - Update allowed origins in `server.js`
   - Add your production domain to the whitelist

### Monitoring and Logging

- Monitor `ai-summaries.json` file size (implement rotation if > 10MB)
- Set up alerts for rate limit violations
- Log all API errors to a secure location

### Encryption at Rest (Future Enhancement)

Consider encrypting the `ai-summaries.json` file:

```javascript
// Example using crypto module
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
```

### Regular Security Updates

```bash
# Check for npm package vulnerabilities
npm audit

# Update packages
npm update

# Fix vulnerabilities
npm audit fix
```

## Incident Response

If API keys are compromised:
1. Immediately revoke keys at Google Cloud Console
2. Generate new keys
3. Update environment variables
4. Review access logs for suspicious activity
5. Rotate all related credentials
