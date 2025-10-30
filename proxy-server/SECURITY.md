# Security Guide for USMC Directives Proxy Server

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
