#!/usr/bin/env node

/**
 * Test Multiple Fetch Methods for IGMC Website
 *
 * This script tests various approaches to fetch data from the IGMC website
 */

const TARGET_URL = 'https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/';

// Test 1: Direct fetch with comprehensive browser headers
async function testDirectFetchWithHeaders() {
  console.log('\n=== TEST 1: Direct Fetch with Browser Headers ===');

  try {
    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        'DNT': '1'
      }
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const text = await response.text();
      console.log('✅ SUCCESS! Received', text.length, 'bytes');
      return { success: true, method: 'Direct with headers', data: text };
    } else {
      console.log('❌ Failed with status:', response.status);
      return { success: false, method: 'Direct with headers', error: response.status };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, method: 'Direct with headers', error: error.message };
  }
}

// Test 2: Using AllOrigins CORS proxy
async function testAllOrigins() {
  console.log('\n=== TEST 2: AllOrigins CORS Proxy ===');

  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(TARGET_URL)}`;

  try {
    const response = await fetch(proxyUrl);
    console.log('Status:', response.status);

    if (response.ok) {
      const json = await response.json();
      console.log('✅ SUCCESS! Received', json.contents?.length || 0, 'bytes');
      return { success: true, method: 'AllOrigins', data: json.contents };
    } else {
      console.log('❌ Failed with status:', response.status);
      return { success: false, method: 'AllOrigins', error: response.status };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, method: 'AllOrigins', error: error.message };
  }
}

// Test 3: Using CORS.io proxy
async function testCorsIo() {
  console.log('\n=== TEST 3: CORS.io Proxy ===');

  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(TARGET_URL)}`;

  try {
    const response = await fetch(proxyUrl);
    console.log('Status:', response.status);

    if (response.ok) {
      const text = await response.text();
      console.log('✅ SUCCESS! Received', text.length, 'bytes');
      return { success: true, method: 'CORS.io', data: text };
    } else {
      console.log('❌ Failed with status:', response.status);
      return { success: false, method: 'CORS.io', error: response.status };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, method: 'CORS.io', error: error.message };
  }
}

// Test 4: Using CodeTabs proxy
async function testCodeTabs() {
  console.log('\n=== TEST 4: CodeTabs Proxy ===');

  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(TARGET_URL)}`;

  try {
    const response = await fetch(proxyUrl);
    console.log('Status:', response.status);

    if (response.ok) {
      const text = await response.text();
      console.log('✅ SUCCESS! Received', text.length, 'bytes');
      return { success: true, method: 'CodeTabs', data: text };
    } else {
      console.log('❌ Failed with status:', response.status);
      return { success: false, method: 'CodeTabs', error: response.status };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, method: 'CodeTabs', error: error.message };
  }
}

// Test 5: Try different User-Agents
async function testDifferentUserAgents() {
  console.log('\n=== TEST 5: Different User-Agents ===');

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', // Firefox
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', // Safari
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Linux Chrome
    'curl/7.68.0' // curl
  ];

  for (const ua of userAgents) {
    console.log(`\nTrying: ${ua.substring(0, 50)}...`);
    try {
      const response = await fetch(TARGET_URL, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      console.log('Status:', response.status);

      if (response.ok) {
        const text = await response.text();
        console.log('✅ SUCCESS with this User-Agent! Received', text.length, 'bytes');
        return { success: true, method: `User-Agent: ${ua}`, data: text };
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }

  console.log('❌ All User-Agents failed');
  return { success: false, method: 'Different User-Agents', error: 'All failed' };
}

// Test 6: Using thingproxy
async function testThingProxy() {
  console.log('\n=== TEST 6: ThingProxy ===');

  const proxyUrl = `https://thingproxy.freeboard.io/fetch/${TARGET_URL}`;

  try {
    const response = await fetch(proxyUrl);
    console.log('Status:', response.status);

    if (response.ok) {
      const text = await response.text();
      console.log('✅ SUCCESS! Received', text.length, 'bytes');
      return { success: true, method: 'ThingProxy', data: text };
    } else {
      console.log('❌ Failed with status:', response.status);
      return { success: false, method: 'ThingProxy', error: response.status };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, method: 'ThingProxy', error: error.message };
  }
}

// Parse HTML to check if we got the right content
function validateContent(html) {
  if (!html) return false;

  // Check for table or checklist indicators
  const hasTable = html.includes('JCSDashboard') ||
                   html.includes('FUNCTIONAL AREA') ||
                   html.includes('FA NUMBER');

  console.log('\nContent Validation:');
  console.log('- Contains JCSDashboard:', html.includes('JCSDashboard'));
  console.log('- Contains FUNCTIONAL AREA:', html.includes('FUNCTIONAL AREA'));
  console.log('- Contains FA NUMBER:', html.includes('FA NUMBER'));

  return hasTable;
}

// Main test runner
async function main() {
  console.log('🔍 Testing Multiple Fetch Methods for IGMC Website');
  console.log('Target URL:', TARGET_URL);
  console.log('='.repeat(60));

  const results = [];

  // Run all tests
  results.push(await testDirectFetchWithHeaders());
  results.push(await testAllOrigins());
  results.push(await testCorsIo());
  results.push(await testCodeTabs());
  results.push(await testThingProxy());
  results.push(await testDifferentUserAgents());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);

  if (successful.length > 0) {
    console.log(`\n✅ ${successful.length} method(s) succeeded:`);
    successful.forEach(r => {
      console.log(`  - ${r.method}`);
      if (r.data) {
        const isValid = validateContent(r.data);
        console.log(`    Valid content: ${isValid ? '✅' : '❌'}`);
      }
    });

    // Use the first successful method
    const best = successful[0];
    console.log(`\n🎯 Best method: ${best.method}`);

  } else {
    console.log('\n❌ All methods failed');
    console.log('\n🔧 Recommendations:');
    console.log('1. Use GitHub Actions scheduled workflow for periodic updates');
    console.log('2. Manual data updates via PR');
    console.log('3. Contact IGMC for API access or RSS feed');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
