#!/usr/bin/env node

/**
 * Fetch SECNAV Directives from RSS Feed
 *
 * This script fetches SECNAV directives from an RSS feed
 * and generates a static JavaScript data file for use in the application.
 *
 * Source: https://rss.app/feeds/gtjRe8dzN4BUYIrV.xml
 * Target: lib/secnav-data.js
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RSS_URL = 'https://rss.app/feeds/gtjRe8dzN4BUYIrV.xml';
const OUTPUT_FILE = join(__dirname, '../lib/secnav-data.js');

/**
 * Try multiple fetch methods with fallbacks
 */
async function tryMultipleFetchMethods(url) {
  console.log('[SECNAV] Trying multiple fetch methods...');

  const methods = [
    // Method 1: Direct fetch
    async () => {
      console.log('[SECNAV] Method 1: Direct fetch');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 2: AllOrigins CORS proxy
    async () => {
      console.log('[SECNAV] Method 2: AllOrigins CORS proxy');
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return json.contents;
    },

    // Method 3: CORS.io proxy
    async () => {
      console.log('[SECNAV] Method 3: CORS.io proxy');
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  ];

  // Try each method until one succeeds
  for (let i = 0; i < methods.length; i++) {
    try {
      const xml = await methods[i]();
      console.log(`[SECNAV] ✓ Success with method ${i + 1}`);
      return xml;
    } catch (error) {
      console.log(`[SECNAV] ✗ Method ${i + 1} failed:`, error.message);
      if (i === methods.length - 1) {
        throw new Error('All fetch methods failed');
      }
    }
  }
}

/**
 * Parse RSS feed and extract SECNAV directives
 */
async function fetchSecnavDirectives() {
  console.log('[SECNAV] Fetching data from RSS feed...');
  console.log('[SECNAV] URL:', RSS_URL);

  try {
    // Fetch RSS XML
    const xml = await tryMultipleFetchMethods(RSS_URL);

    // Parse XML using DOMParser (available in Node.js via JSDOM or similar)
    // For simplicity, we'll use regex parsing for RSS (not ideal but works)
    const directives = [];

    // Match all <item> elements
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...xml.matchAll(itemRegex)];

    console.log(`[SECNAV] Found ${items.length} items in RSS feed`);

    for (const match of items) {
      const itemContent = match[1];

      // Extract fields
      const title = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                   itemContent.match(/<title>(.*?)<\/title>/)?.[1] || '';

      const link = itemContent.match(/<link>(.*?)<\/link>/)?.[1] || '';

      const pubDate = itemContent.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ||
                     itemContent.match(/<dc:date>(.*?)<\/dc:date>/)?.[1] ||
                     new Date().toISOString();

      const description = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                         itemContent.match(/<description>(.*?)<\/description>/)?.[1] || '';

      if (title && link) {
        // Extract SECNAV ID from title (e.g., "SECNAV 5000.1")
        const directiveMatch = title.match(/SECNAV\s+[\d.]+[A-Z]*/i);
        const id = directiveMatch ? directiveMatch[0] : title.substring(0, 50);

        // Clean up subject (remove SECNAV ID from beginning)
        const subject = title.replace(/SECNAV\s+[\d.]+[A-Z]*\s*[-:]?\s*/i, "").trim() || title;

        directives.push({
          id,
          title,
          subject,
          link,
          pubDate,
          description: description.substring(0, 500) // Limit description length
        });
      }
    }

    console.log(`[SECNAV] Successfully parsed ${directives.length} directives`);

    // Sort by publication date (newest first)
    directives.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return directives;

  } catch (error) {
    console.error('[SECNAV] Error fetching data:', error.message);
    console.error('[SECNAV] Returning empty array (graceful degradation)');
    return [];
  }
}

/**
 * Generate JavaScript data file
 */
async function generateDataFile(directives) {
  const timestamp = new Date().toISOString();

  const fileContent = `/**
 * SECNAV Directives Data
 *
 * Auto-generated from SECNAV RSS Feed
 * Source: ${RSS_URL}
 * Generated: ${timestamp}
 * Total Records: ${directives.length}
 *
 * This file is automatically generated by scripts/fetch-secnav.mjs
 * DO NOT EDIT MANUALLY
 */

// SECNAV directives data structure
const SECNAV_DIRECTIVES = ${JSON.stringify(directives, null, 2)};

// Metadata
const SECNAV_META = {
  sourceUrl: '${RSS_URL}',
  generatedAt: '${timestamp}',
  totalRecords: ${directives.length},
  lastUpdate: '${timestamp}'
};

// Export for use in application
if (typeof window !== 'undefined') {
  window.SECNAV_DIRECTIVES = SECNAV_DIRECTIVES;
  window.SECNAV_META = SECNAV_META;
}

// Also support module exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECNAV_DIRECTIVES,
    SECNAV_META
  };
}
`;

  await writeFile(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`[SECNAV] Data file written to: ${OUTPUT_FILE}`);
  console.log(`[SECNAV] Total records: ${directives.length}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('[SECNAV] Starting fetch process...');

  try {
    const directives = await fetchSecnavDirectives();
    await generateDataFile(directives);
    console.log('[SECNAV] ✓ Complete');
    process.exit(0);
  } catch (error) {
    console.error('[SECNAV] Fatal error:', error);
    // Still generate an empty file for graceful degradation
    await generateDataFile([]);
    process.exit(0); // Exit successfully even on error
  }
}

main();
