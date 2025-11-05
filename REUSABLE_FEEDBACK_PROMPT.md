# Reusable Prompt: User Feedback Widget with GitHub Issues Integration

Copy and customize this prompt for implementing a feedback collection system in any web application.

---

## Prompt Template

```
I want to implement a user feedback collection system for my [APP NAME] application that automatically creates GitHub issues.

**Requirements:**

1. **Frontend Feedback Widget**
   - Floating feedback button (bottom-right corner, always visible)
   - Modal form with these fields:
     * Feedback Type dropdown: Bug Report, Feature Request, UX Suggestion
     * Title (required, max 200 chars)
     * Description (required, textarea)
     * Email (optional, for follow-up)
   - Auto-capture technical context:
     * Browser/user agent
     * Screen resolution and viewport size
     * Current page/route
     * App theme (if applicable)
     * Timestamp
     * Any other relevant app state
   - Show success/error messages
   - Close on ESC key or click outside
   - Full dark mode support (if app has dark mode)
   - Mobile responsive

2. **Backend API Integration**
   - POST endpoint: `/api/feedback`
   - Input validation and sanitization:
     * Remove control characters
     * Truncate to safe lengths
     * Handle missing/undefined values
   - Create GitHub issue via GitHub REST API
   - Issue format:
     * Title: `[FEEDBACK TYPE] User's title`
     * Body: Formatted markdown with description and auto-captured context
     * No labels required (title prefix is sufficient)
   - Error handling with detailed logging
   - Rate limiting (optional but recommended)

3. **Environment Configuration**
   - Required environment variables:
     * `GITHUB_TOKEN` - GitHub Personal Access Token with `repo` scope
     * `GITHUB_REPO` - Format: `owner/repository`
   - Debug endpoint: `/api/debug/github` to verify configuration

4. **Implementation Details**
   - Match my existing app's design system and color scheme
   - Integrate with my existing backend (Node.js/Express, Python/Flask, etc.)
   - Use my existing tech stack: [LIST YOUR TECH STACK]
   - File structure:
     * Frontend: Add to existing HTML/CSS/JS (or React/Vue/etc. components)
     * Backend: Add endpoint to existing API server

5. **Documentation**
   - Setup instructions for:
     * Creating GitHub Personal Access Token
     * Adding environment variables
     * Testing the widget
   - Troubleshooting guide
   - User instructions

**My App Details:**
- **Tech Stack:** [e.g., React + Node.js, Vue + Python Flask, vanilla JS + Express, etc.]
- **Styling:** [e.g., Tailwind CSS, custom CSS, Material-UI, etc.]
- **GitHub Repo:** [owner/repository]
- **Backend Already Has:** [CORS, rate limiting, other middleware, etc.]
- **Color Scheme:** [Primary colors, accent colors]
- **Dark Mode:** [Yes/No]

**Existing Files to Modify:**
- Frontend: [e.g., `src/App.tsx`, `public/index.html`, `src/styles.css`]
- Backend: [e.g., `server.js`, `app.py`, `routes/api.js`]

Please implement this feedback widget with:
1. Clean, production-ready code
2. Proper error handling
3. Input sanitization for security
4. Clear code comments
5. Complete documentation

Start by asking any clarifying questions about my specific setup, then implement the solution.
```

---

## Customization Guide

### For Different Frameworks

**React/Next.js:**
```
- Tech Stack: React 18 + Next.js 14 + TypeScript
- Styling: Tailwind CSS
- Add as: New component `components/FeedbackWidget.tsx`
- Backend: Next.js API route `pages/api/feedback.ts` or `app/api/feedback/route.ts`
```

**Vue/Nuxt:**
```
- Tech Stack: Vue 3 + Nuxt 3 + TypeScript
- Styling: Tailwind CSS + Pinia for state
- Add as: New component `components/FeedbackWidget.vue`
- Backend: Nuxt server route `server/api/feedback.post.ts`
```

**Python Flask:**
```
- Tech Stack: Python 3.11 + Flask + Jinja2
- Styling: Bootstrap 5
- Frontend: Add to base template `templates/base.html`
- Backend: Flask route in `app.py` or `routes/feedback.py`
```

**Django:**
```
- Tech Stack: Django 4.2 + Python 3.11
- Styling: Django templates + custom CSS
- Frontend: Add to base template `templates/base.html`
- Backend: Django view in `views.py` + URL route
```

**Ruby on Rails:**
```
- Tech Stack: Rails 7 + Ruby 3.2
- Styling: Tailwind CSS
- Frontend: Add to application layout `app/views/layouts/application.html.erb`
- Backend: Rails controller `app/controllers/feedback_controller.rb`
```

### For Different Hosting Platforms

**Vercel:**
```
Environment variables: Vercel Dashboard → Project Settings → Environment Variables
Add: GITHUB_TOKEN and GITHUB_REPO
```

**Netlify:**
```
Environment variables: Site Settings → Build & Deploy → Environment Variables
Add: GITHUB_TOKEN and GITHUB_REPO
```

**AWS (EC2/ECS):**
```
Environment variables: Via .env file, AWS Systems Manager Parameter Store, or ECS task definition
```

**Heroku:**
```
heroku config:set GITHUB_TOKEN=your_token_here
heroku config:set GITHUB_REPO=owner/repo
```

**Railway:**
```
Environment variables: Project → Variables tab
Add: GITHUB_TOKEN and GITHUB_REPO
```

**Fly.io:**
```
fly secrets set GITHUB_TOKEN=your_token_here
fly secrets set GITHUB_REPO=owner/repo
```

---

## Quick Start Examples

### Example 1: React SPA + Express Backend
```
I want to add a feedback widget to my React app.

Tech Stack: React 18 + TypeScript + Vite + Express backend
Styling: Tailwind CSS
GitHub Repo: myorg/my-react-app
Dark Mode: Yes (using context API)

Frontend Files:
- src/components/FeedbackWidget.tsx (new)
- src/App.tsx (import widget)
- src/index.css (Tailwind)

Backend Files:
- server/index.js (add /api/feedback endpoint)

Please implement the feedback widget with TypeScript types and proper error boundaries.
```

### Example 2: Vanilla JS Static Site
```
I want to add a feedback widget to my static website.

Tech Stack: Vanilla JavaScript + HTML + CSS + Node.js proxy server
Styling: Custom CSS (blue/white color scheme)
GitHub Repo: myorg/my-website
Dark Mode: No

Frontend Files:
- index.html (add modal HTML)
- style.css (add widget styles)
- app.js (add widget logic)

Backend Files:
- server.js (add /api/feedback endpoint)

The widget should match my existing blue (#0066cc) primary color.
```

### Example 3: Django Web App
```
I want to add a feedback widget to my Django application.

Tech Stack: Django 4.2 + Python 3.11 + PostgreSQL
Styling: Bootstrap 5
GitHub Repo: myorg/my-django-app
Dark Mode: Yes (Bootstrap dark theme)

Frontend Files:
- templates/base.html (add modal template)
- static/css/feedback.css (new file)
- static/js/feedback.js (new file)

Backend Files:
- myapp/views.py (add feedback view)
- myapp/urls.py (add URL route)

Please use Django's CSRF protection and follow Django best practices.
```

---

## Pro Tips for Reuse

1. **Save this prompt as a template** - Store it in your notes/wiki for quick access

2. **Adjust the context capture** - Each app has different useful context:
   - E-commerce: Current cart items, product page
   - SaaS: Current workspace, subscription tier
   - Blog: Current article, author
   - Dashboard: Active filters, data range

3. **Customize the feedback types** - Add app-specific types:
   - E-commerce: "Product Issue", "Checkout Problem"
   - Documentation: "Docs Error", "Missing Info"
   - Game: "Gameplay Bug", "Balance Issue"

4. **Add screenshots (optional)** - For visual apps, capture screenshots:
   ```javascript
   html2canvas(document.body).then(canvas => {
     const screenshot = canvas.toDataURL();
     // Include in feedback
   });
   ```

5. **Integrate with existing auth** - If your app has users:
   ```javascript
   const context = {
     ...captureContext(),
     userId: currentUser.id,
     username: currentUser.username,
     accountType: currentUser.tier
   };
   ```

6. **Add to CI/CD** - Auto-deploy when feedback code changes:
   ```yaml
   # .github/workflows/deploy.yml
   - name: Deploy with new feedback widget
     run: npm run deploy
   ```

---

## Security Checklist

Before deploying to production:

- [ ] GITHUB_TOKEN is stored as environment variable (never in code)
- [ ] Input sanitization removes control characters
- [ ] Rate limiting prevents abuse
- [ ] CORS is configured to only allow your domain
- [ ] Token has minimum required permissions (only `repo` scope)
- [ ] Environment variables are not exposed in client-side code
- [ ] Error messages don't leak sensitive information

---

## Testing Checklist

Before marking as complete:

- [ ] Submit test feedback successfully
- [ ] Verify GitHub issue is created with correct format
- [ ] Test with very long title/description (truncation works)
- [ ] Test with special characters and emojis
- [ ] Test dark mode (if applicable)
- [ ] Test mobile responsive layout
- [ ] Test ESC key and click-outside to close
- [ ] Test error handling (disconnect backend)
- [ ] Verify debug endpoint shows correct configuration
- [ ] Check server logs for any errors

---

## Cost Considerations

**Free Tier Limits:**
- GitHub API: 5,000 requests/hour (authenticated)
- Most hosting: 100-1000 requests/month free tier
- Estimated cost: $0-5/month for small apps (<1000 users)

**Scaling:**
- For high-traffic apps, consider:
  - Caching GitHub API responses
  - Queuing feedback submissions
  - Using GitHub Apps instead of PAT
  - Implementing honeypot spam protection

---

**Last Updated:** November 2025
**Based On:** USMC Directives Hub implementation
**Repository:** https://github.com/SemperAdmin/usmc-directives-hub
