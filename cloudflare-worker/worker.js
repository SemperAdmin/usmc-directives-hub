/**
 * Cloudflare Worker to proxy Navy directive websites
 * Deploy this to Cloudflare Workers (free tier available)
 *
 * To deploy:
 * 1. Sign up at https://workers.cloudflare.com
 * 2. Create new worker
 * 3. Copy this code
 * 4. Deploy
 */

const ALLOWED_ORIGINS = [
  'https://semperadmin.github.io',
  'http://localhost:8000',
];

const ALLOWED_DOMAINS = [
  'mynavyhr.navy.mil',
  'secnav.navy.mil',
  'navy.mil'
];

// CORS headers
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin)
    });
  }

  // Health check
  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });
  }

  // ALNAV endpoint: /api/alnav/:year
  if (url.pathname.startsWith('/api/alnav/')) {
    const year = url.pathname.split('/').pop();
    const targetUrl = `https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year}/`;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const html = await response.text();

      return new Response(html, {
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'text/html'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch ALNAV data',
        message: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // SECNAV/OPNAV endpoint: /api/navy-directives
  if (url.pathname === '/api/navy-directives') {
    const targetUrl = 'https://www.secnav.navy.mil/doni/Directives/Forms/Secnav%20Current.aspx';

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const html = await response.text();

      return new Response(html, {
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'text/html'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch SECNAV data',
        message: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Generic proxy: /api/proxy?url=<encoded-url>
  if (url.pathname === '/api/proxy') {
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({
        error: 'Missing url parameter'
      }), {
        status: 400,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      });
    }

    // Security: Check if domain is allowed
    const targetUrlObj = new URL(targetUrl);
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      targetUrlObj.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      return new Response(JSON.stringify({
        error: 'Domain not allowed',
        allowedDomains: ALLOWED_DOMAINS
      }), {
        status: 403,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const html = await response.text();

      return new Response(html, {
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'text/html'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch data',
        message: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Default response
  return new Response(JSON.stringify({
    error: 'Not found',
    endpoints: [
      '/health',
      '/api/alnav/:year',
      '/api/navy-directives',
      '/api/proxy?url=<url>'
    ]
  }), {
    status: 404,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json'
    }
  });
}

// Cloudflare Workers event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
