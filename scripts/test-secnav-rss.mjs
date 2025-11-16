#!/usr/bin/env node

/**
 * Test SECNAV RSS Feed
 *
 * This script tests the SECNAV RSS feed to see if it's accessible and usable
 * RSS URL: https://www.secnav.navy.mil/doni/Recent/listfeed.aspx
 */

import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

const RSS_URL = 'https://www.secnav.navy.mil/doni/Recent/listfeed.aspx';

// Browser headers
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
};

/**
 * Try multiple fetch methods with fallbacks
 */
async function tryMultipleFetchMethods(url) {
  console.log('[RSS-TEST] Trying multiple fetch methods...');

  const methods = [
    // Method 1: Direct fetch
    async () => {
      console.log('[RSS-TEST] Method 1: Direct fetch');
      const response = await fetch(url, { headers: BROWSER_HEADERS });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 2: AllOrigins proxy
    async () => {
      console.log('[RSS-TEST] Method 2: AllOrigins CORS proxy');
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return json.contents;
    },

    // Method 3: ThingProxy
    async () => {
      console.log('[RSS-TEST] Method 3: ThingProxy');
      const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 4: CORS.SH proxy
    async () => {
      console.log('[RSS-TEST] Method 4: CORS.SH proxy');
      const proxyUrl = `https://cors.sh/${url}`;
      const response = await fetch(proxyUrl, {
        headers: {
          'x-cors-api-key': 'temp_public',
          ...BROWSER_HEADERS
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  ];

  // Try each method
  for (let i = 0; i < methods.length; i++) {
    try {
      const xml = await methods[i]();
      console.log(`[RSS-TEST] ✓ Success with method ${i + 1}`);
      console.log(`[RSS-TEST] Response length: ${xml.length} bytes`);
      return xml;
    } catch (error) {
      console.log(`[RSS-TEST] ✗ Method ${i + 1} failed:`, error.message);
      if (i === methods.length - 1) {
        throw new Error('All fetch methods failed');
      }
    }
  }
}

/**
 * Parse RSS feed and extract items
 */
async function parseRSSFeed(xml) {
  console.log('[RSS-TEST] Parsing RSS/XML...');

  const result = await parseXML(xml, {
    trim: true,
    explicitArray: false,
    mergeAttrs: true
  });

  console.log('[RSS-TEST] XML parsed successfully');

  // Handle both RSS 2.0 and Atom feeds
  let items = [];

  if (result.rss && result.rss.channel) {
    // RSS 2.0 format
    console.log('[RSS-TEST] Format: RSS 2.0');
    const channel = result.rss.channel;
    items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
  } else if (result.feed && result.feed.entry) {
    // Atom format
    console.log('[RSS-TEST] Format: Atom');
    items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
  }

  console.log(`[RSS-TEST] Found ${items.length} items`);

  return items;
}

/**
 * Convert RSS items to directive format
 */
function convertToDirectiveFormat(items) {
  console.log('[RSS-TEST] Converting to directive format...');

  const directives = items.map((item, index) => {
    // Handle both RSS and Atom formats
    const title = item.title?._ || item.title || 'Untitled';
    const link = item.link?.href || item.link || '';
    const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
    const description = item.description?._ || item.description || item.summary?._ || item.summary || '';

    // Extract SECNAV ID from title
    const idMatch = title.match(/SECNAV[\s\-_]*[\d.]+[A-Z]*/i) ||
                   link.match(/SECNAV[\s\-_]*[\d.]+[A-Z]*/i);
    const id = idMatch ? idMatch[0].replace(/[\s\-_]+/g, ' ').toUpperCase() : `ITEM-${index + 1}`;

    // Create subject by removing SECNAV ID prefix
    const subject = title.replace(/SECNAV[\s\-_]*[\d.]+[A-Z]*\s*[-:]?\s*/i, '').trim() || title;

    return {
      id,
      title,
      subject,
      link,
      pubDate: new Date(pubDate).toISOString(),
      description: description.substring(0, 500),
      effectiveDate: pubDate
    };
  });

  // Sort by publication date (newest first)
  directives.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  return directives;
}

/**
 * Main test function
 */
async function main() {
  console.log('[RSS-TEST] Starting RSS feed test...');
  console.log('[RSS-TEST] URL:', RSS_URL);
  console.log('');

  try {
    // Step 1: Fetch the RSS feed
    const xml = await tryMultipleFetchMethods(RSS_URL);
    console.log('');

    // Step 2: Show a preview of the raw XML
    console.log('[RSS-TEST] Raw XML Preview (first 500 chars):');
    console.log('─'.repeat(60));
    console.log(xml.substring(0, 500));
    console.log('─'.repeat(60));
    console.log('');

    // Step 3: Parse the RSS feed
    const items = await parseRSSFeed(xml);
    console.log('');

    // Step 4: Convert to directive format
    const directives = convertToDirectiveFormat(items);
    console.log('');

    // Step 5: Show sample results
    console.log('[RSS-TEST] Sample Results (first 3 items):');
    console.log('═'.repeat(60));
    directives.slice(0, 3).forEach((directive, index) => {
      console.log(`\n${index + 1}. ${directive.id}`);
      console.log(`   Title: ${directive.title}`);
      console.log(`   Subject: ${directive.subject}`);
      console.log(`   Link: ${directive.link}`);
      console.log(`   Date: ${directive.pubDate}`);
      console.log(`   Description: ${directive.description.substring(0, 100)}...`);
    });
    console.log('═'.repeat(60));
    console.log('');

    // Step 6: Summary
    console.log('[RSS-TEST] ✓ SUCCESS - RSS feed is working!');
    console.log(`[RSS-TEST] Total items found: ${directives.length}`);
    console.log('[RSS-TEST] This RSS feed can replace the current HTML scraping approach');
    console.log('');

    // Output JSON for inspection
    console.log('[RSS-TEST] Full JSON output:');
    console.log(JSON.stringify(directives, null, 2));

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('[RSS-TEST] ✗ FAILED');
    console.error('[RSS-TEST] Error:', error.message);
    console.error('[RSS-TEST] Stack:', error.stack);
    console.error('');
    console.error('[RSS-TEST] The RSS feed is not accessible or has issues');
    process.exit(1);
  }
}

main();
