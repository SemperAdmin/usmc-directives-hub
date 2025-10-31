# Backend API Requirements for Semper Admin Integration

## New Endpoint Required

The frontend now calls `/api/facebook/semperadmin` to fetch Semper Admin posts from Facebook.

### Endpoint: `GET /api/facebook/semperadmin`

**Purpose:** Fetch recent posts from the Semper Admin Facebook page using the Facebook Graph API.

**Environment Variable Required:**
- `SEMPER_ADMIN_API_KEY` - Facebook Page Access Token (stored as GitHub Secret)

**Implementation Example (Node.js/Express):**

```javascript
app.get('/api/facebook/semperadmin', async (req, res) => {
  try {
    const accessToken = process.env.SEMPER_ADMIN_API_KEY;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Facebook API token not configured'
      });
    }

    // Facebook Page ID for Semper Admin: 61558093420252
    const pageId = '61558093420252';

    // Fetch posts from Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?` +
      `fields=id,message,story,created_time,permalink_url,full_picture&` +
      `limit=100&` +
      `access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      posts: data.data || []
    });
  } catch (error) {
    console.error('Error fetching Semper Admin posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Semper Admin posts',
      message: error.message
    });
  }
});
```

### Expected Response Format

```json
{
  "success": true,
  "posts": [
    {
      "id": "61558093420252_122142345678901234",
      "message": "Post content here...",
      "story": "Optional story field",
      "created_time": "2025-10-31T12:00:00+0000",
      "permalink_url": "https://www.facebook.com/61558093420252/posts/122142345678901234",
      "full_picture": "https://scontent.xx.fbcdn.net/..."
    }
  ]
}
```

### Facebook Graph API Fields Used

- `id` - Post ID
- `message` - Post text content
- `story` - Alternative text (if message is empty)
- `created_time` - Publication timestamp
- `permalink_url` - Direct link to the post
- `full_picture` - Post image URL (optional)

### Security Notes

1. The access token should NEVER be exposed in the frontend code
2. Store the token as an environment variable: `SEMPER_ADMIN_API_KEY`
3. In GitHub Actions, set this as a secret: `SEMPER_ADMIN_API_KEY`
4. The token should be a Page Access Token with `pages_read_engagement` permission
5. Consider implementing rate limiting on this endpoint

### Access Token Information

**Current Token:** `EAAQhR9VOB8oBPwkpE5fa9i3e06tDBzHiTRvo8IEAVLiClCa7YingIhtF9ks5nC9IXfL7LWl7ImjyS4NL9Ozdtb4ymDNWAJ9gxWb3bxvpdOvi5aqnsOJfXml6FfpRNz6QSf7mWSaeO0O7jeFZC2XGJ9AxyIUJoz7hrCO2LYbRcObN9UZA60AgPj9kyxe2ZAhoyjduTIvE6tvUGcZD`

**Note:** This token should be added to the backend proxy server's environment variables, not committed to the repository.
