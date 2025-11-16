# Security Headers Configuration

This document provides guidance on configuring additional security headers for the USMC Directives Hub application.

## Current Security Implementation

### ✅ Already Configured

The application currently has a **Content Security Policy (CSP)** configured in `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://unpkg.com/web-vitals@3.5.0/;
  style-src 'self';
  img-src 'self' data: https:;
  connect-src 'self'
    https://www.marines.mil
    https://www.mynavyhr.navy.mil
    https://www.secnav.navy.mil
    https://www.igmc.marines.mil
    https://www.esd.whs.mil
    https://comptroller.defense.gov
    https://www.travel.dod.mil
    https://usmc-directives-proxy.onrender.com
    http://localhost:3000
    https://corsproxy.io
    https://api.allorigins.win
    https://cors-anywhere.herokuapp.com
    https://api.codetabs.com;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
">
```

**Security Benefits:**
- ✅ XSS protection (strict script sources)
- ✅ Clickjacking prevention (frame-ancestors 'none')
- ✅ Plugin content blocked (object-src 'none')
- ✅ HTTPS enforcement (upgrade-insecure-requests)
- ✅ Whitelisted API endpoints only

---

## Recommended Additional Headers

### Priority: High

#### 1. X-Frame-Options
**Purpose:** Prevents clickjacking attacks (defense in depth)

**Configuration:**
```html
<!-- Add to index.html <head> -->
<meta http-equiv="X-Frame-Options" content="DENY">
```

**Server Configuration (if using custom server):**
```
X-Frame-Options: DENY
```

**Note:** This duplicates `frame-ancestors 'none'` from CSP for older browsers.

---

#### 2. X-Content-Type-Options
**Purpose:** Prevents MIME-type sniffing attacks

**Configuration:**
```html
<!-- Add to index.html <head> -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

**Server Configuration:**
```
X-Content-Type-Options: nosniff
```

**Why:** Forces browsers to respect the declared Content-Type, preventing execution of misidentified files.

---

#### 3. Referrer-Policy
**Purpose:** Controls referrer information sent to external sites

**Configuration:**
```html
<!-- Add to index.html <head> -->
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**Server Configuration:**
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Options:**
- `no-referrer` - Never send referrer (most private)
- `strict-origin-when-cross-origin` - Send origin only on HTTPS→HTTP (recommended)
- `same-origin` - Only send referrer to same origin

**Recommendation:** `strict-origin-when-cross-origin` for good privacy/functionality balance

---

### Priority: Medium

#### 4. Permissions-Policy
**Purpose:** Disable unnecessary browser features

**Configuration:**
```html
<!-- Add to index.html <head> -->
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=(), payment=(), usb=()">
```

**Server Configuration:**
```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
```

**Why:** Explicitly disables features the app doesn't need, reducing attack surface.

---

#### 5. Cross-Origin-Opener-Policy (COOP)
**Purpose:** Isolates browsing context

**Configuration (Server Only):**
```
Cross-Origin-Opener-Policy: same-origin
```

**Why:** Prevents other origins from accessing your window object.

**Note:** Cannot be set via meta tag, requires server configuration.

---

#### 6. Cross-Origin-Resource-Policy (CORP)
**Purpose:** Protects resources from cross-origin reads

**Configuration (Server Only):**
```
Cross-Origin-Resource-Policy: same-origin
```

**Why:** Prevents other sites from embedding your resources.

**Note:** Cannot be set via meta tag, requires server configuration.

---

## Implementation Guide

### For GitHub Pages Deployment

GitHub Pages does not allow custom server headers, so use meta tags:

**Add to `index.html` in the `<head>` section:**

```html
<!-- Additional Security Headers -->
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=(), payment=(), usb=()">
```

**Limitations:**
- ⚠️ COOP and CORP require server headers (not available on GitHub Pages)
- ✅ Meta tags work for X-Frame-Options, X-Content-Type-Options, Referrer-Policy

---

### For Custom Server / Render.com Deployment

If deploying to a custom server (e.g., Render.com proxy), add headers at the server level.

#### Nginx Configuration

Add to your server block:

```nginx
server {
    # ... existing config ...

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # Content-Security-Policy (move from meta tag for better support)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://unpkg.com/web-vitals@3.5.0/; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https://www.marines.mil https://www.mynavyhr.navy.mil https://www.secnav.navy.mil https://www.igmc.marines.mil https://www.esd.whs.mil https://comptroller.defense.gov https://www.travel.dod.mil https://usmc-directives-proxy.onrender.com http://localhost:3000 https://corsproxy.io https://api.allorigins.win https://cors-anywhere.herokuapp.com https://api.codetabs.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
}
```

---

#### Express.js / Node.js Configuration

For the proxy server in `proxy-server/server.js`:

```javascript
// Add helmet middleware
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: false, // Handled by frontend
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    features: {
      geolocation: ["'none'"],
      microphone: ["'none'"],
      camera: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"]
    }
  }
}));

// Additional headers not covered by helmet
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
```

**Install helmet:**
```bash
cd proxy-server
npm install helmet
```

---

## Testing Your Security Headers

### Online Tools

1. **Security Headers**: https://securityheaders.com/
   - Enter your deployed URL
   - Get an A+ rating goal

2. **Mozilla Observatory**: https://observatory.mozilla.org/
   - Comprehensive security audit
   - Provides recommendations

3. **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
   - Validates your Content Security Policy
   - Identifies potential bypasses

### Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Click on the main document request
5. Check "Response Headers" section
6. Verify security headers are present

---

## Security Checklist

### Current Status (as of 2025-11-16)

- ✅ Content-Security-Policy configured (meta tag)
- ⚠️ X-Frame-Options (recommended - add meta tag)
- ⚠️ X-Content-Type-Options (recommended - add meta tag)
- ⚠️ Referrer-Policy (recommended - add meta tag)
- ⚠️ Permissions-Policy (optional - add meta tag)
- ❌ Cross-Origin-Opener-Policy (requires server, not available on GitHub Pages)
- ❌ Cross-Origin-Resource-Policy (requires server, not available on GitHub Pages)

### Quick Win Implementation

**Add these 4 lines to `index.html` after the CSP meta tag:**

```html
<!-- Additional Security Headers -->
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=(), payment=(), usb=()">
```

**Impact:**
- ⏱️ Time: 2 minutes
- 🔒 Security: Medium improvement
- 🎯 Risk: None
- ✅ Compatibility: All modern browsers

---

## Security Best Practices

### 1. Regular Updates
- Review security headers quarterly
- Update CSP when adding new external resources
- Monitor security advisories for dependencies

### 2. Dependency Management
- Run `npm audit` regularly
- Update dependencies promptly
- Use Dependabot for automated PRs

### 3. Code Security
- Never use `eval()` or `Function()` constructor
- Sanitize all user input (already implemented via `escapeHtml()`)
- Use HTTPS for all external resources

### 4. Monitoring
- Set up security header monitoring
- Use Content-Security-Policy-Report-Only for testing
- Log CSP violations (if proxy server available)

---

## References

- **MDN Web Security**: https://developer.mozilla.org/en-US/docs/Web/Security
- **OWASP Secure Headers**: https://owasp.org/www-project-secure-headers/
- **CSP Quick Reference**: https://content-security-policy.com/
- **Security Headers Reference**: https://securityheaders.com/

---

**Last Updated:** 2025-11-16
**Status:** Documentation complete - Implementation recommended
**Priority:** High (meta tags), Medium (server headers)
