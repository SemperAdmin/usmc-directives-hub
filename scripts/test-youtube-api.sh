#!/bin/bash

# YouTube API Diagnostic Script
# Tests if the YouTube API is working correctly

echo "======================================"
echo "YouTube API Diagnostic Test"
echo "======================================"
echo ""

# Configuration
RENDER_URL="https://usmc-directives-proxy.onrender.com"

echo "1. Testing Render Proxy Server Health..."
echo "   URL: $RENDER_URL/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$RENDER_URL/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Health check passed"
  echo "   Response: $RESPONSE_BODY"
else
  echo "   ❌ Health check failed (HTTP $HTTP_CODE)"
  echo "   Response: $RESPONSE_BODY"
  echo ""
  echo "   Possible causes:"
  echo "   - Render service is down or spinning up (free tier sleeps after 15min)"
  echo "   - CORS blocking (expected when running from CLI)"
fi

echo ""
echo "2. Testing YouTube API Endpoint..."
echo "   URL: $RENDER_URL/api/youtube/videos?maxResults=5"
echo ""

YT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$RENDER_URL/api/youtube/videos?maxResults=5" 2>&1)
YT_HTTP_CODE=$(echo "$YT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
YT_RESPONSE_BODY=$(echo "$YT_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$YT_HTTP_CODE" = "200" ]; then
  echo "   ✅ YouTube API working!"
  echo "   Response (first 200 chars):"
  echo "   $(echo "$YT_RESPONSE_BODY" | head -c 200)..."
  echo ""
  echo "   Video count:"
  echo "$YT_RESPONSE_BODY" | grep -o '"items":\[' | wc -l | xargs echo "   "
elif [ "$YT_HTTP_CODE" = "503" ]; then
  echo "   ❌ YouTube API key not configured (HTTP 503)"
  echo "   Response: $YT_RESPONSE_BODY"
  echo ""
  echo "   FIX:"
  echo "   1. Go to https://dashboard.render.com"
  echo "   2. Select 'usmc-directives-proxy' service"
  echo "   3. Environment tab → Add 'YOUTUBE_API_KEY'"
  echo "   4. Get key from: https://console.cloud.google.com"
elif [ "$YT_HTTP_CODE" = "403" ]; then
  echo "   ❌ YouTube API key invalid or quota exceeded (HTTP 403)"
  echo "   Response: $YT_RESPONSE_BODY"
  echo ""
  echo "   FIX:"
  echo "   1. Check quota: https://console.cloud.google.com"
  echo "   2. Verify API key is valid"
  echo "   3. Check API restrictions"
else
  echo "   ❌ YouTube API failed (HTTP $YT_HTTP_CODE)"
  echo "   Response: $YT_RESPONSE_BODY"
fi

echo ""
echo "3. Browser Console Check..."
echo "   Open your browser and go to:"
echo "   https://semperadmin.github.io/usmc-directives-hub/"
echo ""
echo "   Open Developer Tools (F12) → Console"
echo "   Look for these messages:"
echo "   - 'Fetching YouTube videos from YouTube Data API...'"
echo "   - 'YouTube API error (503): ...' → API key not set"
echo "   - 'YouTube API error (403): ...' → API key invalid/quota"
echo "   - 'Total YouTube videos loaded: X' → Success!"

echo ""
echo "======================================"
echo "Diagnostic Complete"
echo "======================================"
