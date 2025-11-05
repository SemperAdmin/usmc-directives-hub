# Feedback Widget Setup Guide

This guide explains how to set up and use the user feedback collection system that creates GitHub issues automatically.

## Overview

The feedback widget allows users to submit bug reports, feature requests, and UX suggestions directly from the app. Feedback is automatically converted into GitHub issues with proper labels and context.

## Features

- 🎯 **Floating feedback button** - Always visible in the bottom-right corner
- 📝 **Structured feedback form** - Bug Report, Feature Request, or UX Suggestion
- 🤖 **Auto-creates GitHub issues** - No manual issue creation needed
- 📊 **Context capture** - Automatically captures browser, screen size, current tab, theme, etc.
- 🌓 **Dark mode support** - Matches your app theme
- 📧 **Optional email** - Users can provide contact info for follow-up
- 📱 **Mobile responsive** - Works on all devices

## Setup Instructions

### 1. Create a GitHub Personal Access Token (PAT)

**⚠️ Security Recommendation:** Use fine-grained tokens for better security (principle of least privilege).

#### Option A: Fine-Grained Personal Access Token (Recommended) 🔒

Fine-grained tokens allow you to grant only the specific permissions needed for this repository.

1. **Go to:** GitHub Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
   - Or visit: https://github.com/settings/tokens?type=beta

2. **Click:** "Generate new token"

3. **Configure the token:**
   - **Token name:** `USMC Directives Hub Feedback`
   - **Expiration:** 90 days (recommended) or custom
   - **Resource owner:** Select your account or organization
   - **Repository access:** Select **"Only select repositories"**
   - **Selected repositories:** Choose `SemperAdmin/usmc-directives-hub`
   - **Permissions → Repository permissions:**
     - **Issues:** Set to **Read and write** ✅
     - Leave all other permissions as "No access"

4. **Click:** "Generate token"

5. **IMPORTANT:** Copy the token immediately - starts with `github_pat_...`

**Why fine-grained tokens?**
- ✅ Only grants access to this specific repository
- ✅ Only allows creating/editing issues (not code access)
- ✅ Reduces risk if token is compromised
- ✅ Follows security best practices

---

#### Option B: Classic Personal Access Token (Fallback)

If fine-grained tokens don't work for your setup, use a classic token:

1. **Go to:** GitHub Settings → Developer settings → Personal access tokens → **Tokens (classic)**
   - Or visit: https://github.com/settings/tokens

2. **Click:** "Generate new token (classic)"

3. **Configure the token:**
   - **Note:** `USMC Directives Hub Feedback`
   - **Expiration:** 90 days (recommended) or No expiration
   - **Scopes:** Check **`repo`** (Full control of private repositories)
     - ⚠️ Warning: This grants access to ALL your repositories

4. **Click:** "Generate token"

5. **IMPORTANT:** Copy the token immediately - starts with `ghp_...`

**Note:** Classic tokens have broader permissions than necessary. Use fine-grained tokens when possible.

### 2. Add GitHub Token to Environment Variables

#### For Render.com (Current Deployment)

1. Go to your Render.com dashboard
2. Select your `usmc-directives-proxy` service
3. Go to "Environment" tab
4. Add a new environment variable:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** `your_github_personal_access_token_here`
5. Click "Save Changes"
6. The service will automatically redeploy

#### For Local Development

Add to your `.env` file in the `proxy-server/` directory:

```bash
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_REPO=SemperAdmin/usmc-directives-hub
```

**Note:** Never commit `.env` files to version control!

### 3. Create GitHub Issue Labels (Recommended)

Create these labels in your GitHub repository for better organization:

1. Go to: https://github.com/SemperAdmin/usmc-directives-hub/labels

2. Create the following labels:

| Label Name | Color | Description |
|------------|-------|-------------|
| `user-feedback` | `#0075ca` (blue) | Feedback submitted via in-app widget |
| `bug` | `#d73a4a` (red) | Bug reports from users |
| `feature-request` | `#a2eeef` (light blue) | New feature suggestions |
| `ux-suggestion` | `#d876e3` (purple) | UX/UI improvement suggestions |

**Note:** The `bug` label may already exist. The feedback system will still work without these labels, but they help with organization.

### 4. Test the Feedback Widget

1. Open the app: https://semperadmin.github.io/usmc-directives-hub/

2. Click the "💬 Feedback" button in the bottom-right corner

3. Fill out the form:
   - **Type:** Select "Bug Report"
   - **Title:** "Test feedback widget"
   - **Description:** "This is a test to verify the feedback widget is working correctly."
   - **Email:** (optional)

4. Click "Submit Feedback"

5. Check your GitHub repository issues to verify the issue was created:
   - https://github.com/SemperAdmin/usmc-directives-hub/issues

## Usage for End Users

### How to Submit Feedback

1. **Click the Feedback Button**
   - Located in the bottom-right corner of every page
   - Shows "💬 Feedback"

2. **Select Feedback Type**
   - **Bug Report:** Something isn't working correctly
   - **Feature Request:** Suggest a new feature or improvement
   - **UX Suggestion:** Suggest UI/UX improvements

3. **Fill Out the Form**
   - **Title:** Brief summary (required)
   - **Description:** Detailed explanation (required)
   - **Email:** Optional - provide if you want follow-up

4. **Submit**
   - Click "Submit Feedback"
   - You'll see a success message with a link to the GitHub issue
   - Modal will close automatically after 3 seconds

### What Gets Captured Automatically

The system automatically captures technical context to help developers debug issues:

- Browser and version
- Screen resolution and viewport size
- Current tab (MARADMINs, MCPUBs, etc.)
- Active date filter
- Theme (dark/light mode)
- Timestamp
- Page URL

**Privacy Note:** No personally identifiable information (PII) is captured unless you voluntarily provide it in the email field.

## Keyboard Shortcuts

- **ESC:** Close the feedback modal (if open)

## API Endpoint Details

### POST `/api/feedback`

**Request Body:**
```json
{
  "type": "bug|feature|ux",
  "title": "Brief summary",
  "description": "Detailed description",
  "email": "optional@email.mil",
  "context": {
    "browser": "User agent string",
    "screenResolution": "1920x1080",
    "viewport": "1440x900",
    "currentTab": "maradmin",
    "dateFilter": "30",
    "theme": "dark",
    "timestamp": "2025-11-05T12:00:00.000Z",
    "url": "https://semperadmin.github.io/usmc-directives-hub/"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "issueUrl": "https://github.com/SemperAdmin/usmc-directives-hub/issues/123",
  "issueNumber": 123
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Troubleshooting

### Issue: "Error submitting feedback"

**Possible Causes:**

1. **GitHub token not configured**
   - Check environment variables on Render.com
   - Verify `GITHUB_TOKEN` is set correctly

2. **Invalid GitHub token**
   - Token may have expired
   - Token may not have `repo` scope
   - Generate a new token and update environment variable

3. **GitHub API rate limit**
   - GitHub limits API requests
   - Wait a few minutes and try again
   - Check GitHub API rate limit: https://api.github.com/rate_limit

4. **Network issues**
   - Check if proxy server is running: https://usmc-directives-proxy.onrender.com/health
   - Verify CORS is configured correctly

### Issue: Feedback button not visible

**Possible Causes:**

1. **JavaScript not loaded**
   - Check browser console for errors
   - Clear browser cache and reload

2. **CSS not applied**
   - Check browser console for 404 errors
   - Verify `style.css` is loading correctly

3. **Older cached version**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Issue: Modal closes immediately after opening

**Possible Cause:**

- JavaScript conflict or error
- Check browser console for errors
- Try disabling browser extensions

## Monitoring Feedback

### View All Feedback Issues

1. Go to: https://github.com/SemperAdmin/usmc-directives-hub/issues

2. Filter by label:
   - Click "Labels" → Select "user-feedback"
   - Or use this link: https://github.com/SemperAdmin/usmc-directives-hub/issues?q=is%3Aissue+label%3Auser-feedback

### Respond to Feedback

1. Open the GitHub issue
2. Read the user's feedback and auto-captured context
3. Respond directly in the issue comments
4. Label appropriately (e.g., `wontfix`, `duplicate`, `good first issue`)
5. Close the issue when resolved

### Export Feedback Data

GitHub provides several ways to export issue data:

1. **CSV Export** (via GitHub UI)
2. **GitHub API** (programmatic access)
3. **GitHub GraphQL API** (advanced queries)

## Security Considerations

1. **GitHub Token Security**
   - Never commit tokens to version control
   - Use environment variables only
   - Rotate tokens regularly (every 90 days recommended)
   - Use fine-grained tokens if possible (beta feature)

2. **Rate Limiting**
   - Feedback endpoint uses same rate limit as other API endpoints
   - 100 requests per 15 minutes per IP address
   - Prevents abuse and excessive API usage

3. **Input Validation**
   - All inputs are validated on frontend and backend
   - XSS protection via proper escaping
   - No executable code allowed in feedback

4. **CORS Protection**
   - Only allows requests from:
     - https://semperadmin.github.io
     - http://localhost:8000 (development)
     - http://127.0.0.1:8000 (development)

## Future Enhancements

Potential improvements to consider:

1. **Email notifications** - Notify maintainers when feedback is submitted
2. **Feedback analytics** - Dashboard showing feedback trends
3. **Duplicate detection** - Prevent duplicate issues
4. **Upvoting system** - Let users vote on existing feedback
5. **Screenshot capture** - Automatically attach screenshots
6. **Feedback history** - Show user their previous feedback

## Support

For technical issues with the feedback widget itself:

1. Check this documentation first
2. Review browser console for errors
3. Test the `/health` endpoint: https://usmc-directives-proxy.onrender.com/health
4. Create a GitHub issue manually if the widget is broken
5. Contact the development team

---

**Last Updated:** November 5, 2025
**Maintainer:** Semper Admin Development Team
