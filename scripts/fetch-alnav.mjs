#!/usr/bin/env node

/**
 * Fetch ALNAV Messages from Navy Website
 *
 * This script scrapes ALNAV messages from MyNavyHR website
 * and generates a static JavaScript data file for use in the application.
 *
 * Source: https://www.mynavyhr.navy.mil/References/Messages/ALNAV-{YEAR}/
 * Target: lib/alnav-data.js
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_FILE = join(__dirname, '../lib/alnav-data.js');

// Number of years to fetch (current + previous years)
const YEARS_TO_FETCH = 3;

/**
 * Get years to fetch (current year and previous N years)
 * Centralized calculation to follow DRY principle
 */
function getYearsToFetch() {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let i = 0; i < YEARS_TO_FETCH; i++) {
    years.push(currentYear - i);
  }

  return years;
}

/**
 * Get ALNAV URLs for current and past years
 */
function getAlnavUrls() {
  const years = getYearsToFetch();
  return years.map(year => `https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${year}/`);
}

/**
 * Try multiple fetch methods with fallbacks
 */
async function tryMultipleFetchMethods(url) {
  const methods = [
    // Method 1: Direct fetch
    async () => {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 2: AllOrigins CORS proxy
    async () => {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return json.contents;
    },

    // Method 3: CORS.io proxy
    async () => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  ];

  // Try each method until one succeeds
  for (let i = 0; i < methods.length; i++) {
    try {
      const html = await methods[i]();
      return html;
    } catch (error) {
      if (i === methods.length - 1) {
        throw new Error('All fetch methods failed');
      }
    }
  }
}

/**
 * Parse ALNAV messages from a single page
 */
async function parseAlnavPage(url) {
  console.log(`[ALNAV] Fetching: ${url}`);

  try {
    // Dynamic import of cheerio
    const cheerio = await import('cheerio');

    const html = await tryMultipleFetchMethods(url);
    const $ = cheerio.load(html);

    const messages = [];

    // Find all message links (adjust selector based on actual HTML structure)
    $('a[href*="ALNAV"]').each((index, element) => {
      const $link = $(element);
      const text = $link.text().trim();
      const href = $link.attr('href');

      if (!text || !href) return;

      // Extract ALNAV ID (e.g., "ALNAV 001/24")
      const alnavMatch = text.match(/ALNAV\s*(\d+)\/(\d+)/i);

      if (alnavMatch) {
        const alnavNumber = alnavMatch[1];
        const year = alnavMatch[2];
        const fullYear = year.length === 2 ? `20${year}` : year;

        const id = `ALNAV ${alnavNumber}/${year}`;

        // Try to extract subject from text after ID
        // Only remove the ALNAV ID and leading separator (not all hyphens/colons)
        const subject = text.replace(/ALNAV\s*\d+\/\d+\s*[-:]?\s*/i, '').trim() ||
                       `ALNAV ${alnavNumber}/${year}`;

        // Build full URL
        const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;

        // Estimate publication date from year
        const pubDate = new Date(`${fullYear}-01-01`).toISOString();

        messages.push({
          id,
          title: text,
          subject,
          link: fullUrl,
          pubDate,
          description: ''
        });
      }
    });

    console.log(`[ALNAV] Found ${messages.length} messages from ${url}`);
    return messages;

  } catch (error) {
    console.warn(`[ALNAV] Failed to fetch ${url}:`, error.message);
    return [];
  }
}

/**
 * Fetch all ALNAV messages
 */
async function fetchAlnavMessages() {
  console.log('[ALNAV] Fetching data from Navy website...');

  const urls = getAlnavUrls();
  console.log(`[ALNAV] Fetching from ${urls.length} pages`);

  const allMessages = [];

  for (const url of urls) {
    const messages = await parseAlnavPage(url);
    allMessages.push(...messages);
  }

  // Remove duplicates based on ID
  const uniqueMessages = [];
  const seen = new Set();

  for (const msg of allMessages) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id);
      uniqueMessages.push(msg);
    }
  }

  // Sort by publication date (newest first)
  uniqueMessages.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  console.log(`[ALNAV] Successfully fetched ${uniqueMessages.length} unique messages`);

  return uniqueMessages;
}

/**
 * Generate JavaScript data file
 */
async function generateDataFile(messages) {
  const timestamp = new Date().toISOString();
  const years = getYearsToFetch(); // Use centralized year calculation
  const yearRange = `${years[years.length - 1]}-${years[0]}`; // e.g., "2023-2025"

  const fileContent = `/**
 * ALNAV Messages Data
 *
 * Auto-generated from MyNavyHR Website
 * Source: https://www.mynavyhr.navy.mil/References/Messages/ALNAV-{YEAR}/
 * Years Fetched: ${yearRange} (${years.join(', ')})
 * Generated: ${timestamp}
 * Total Records: ${messages.length}
 *
 * This file is automatically generated by scripts/fetch-alnav.mjs
 * Fetches from current year and previous ${YEARS_TO_FETCH - 1} years dynamically
 * DO NOT EDIT MANUALLY
 */

// ALNAV messages data structure
const ALNAV_MESSAGES = ${JSON.stringify(messages, null, 2)};

// Metadata
const ALNAV_META = {
  sourceUrls: [${years.map(y => `'https://www.mynavyhr.navy.mil/References/Messages/ALNAV-${y}/'`).join(', ')}],
  yearsFetched: [${years.join(', ')}],
  yearRange: '${yearRange}',
  generatedAt: '${timestamp}',
  totalRecords: ${messages.length}
};

// Export for use in application
if (typeof window !== 'undefined') {
  window.ALNAV_MESSAGES = ALNAV_MESSAGES;
  window.ALNAV_META = ALNAV_META;
}

// Also support module exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ALNAV_MESSAGES,
    ALNAV_META
  };
}
`;

  await writeFile(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`[ALNAV] Data file written to: ${OUTPUT_FILE}`);
  console.log(`[ALNAV] Total records: ${messages.length}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('[ALNAV] Starting fetch process...');

  try {
    const messages = await fetchAlnavMessages();
    await generateDataFile(messages);
    console.log('[ALNAV] ✓ Complete');
    process.exit(0);
  } catch (error) {
    console.error('[ALNAV] Fatal error:', error);
    // Still generate an empty file for graceful degradation
    await generateDataFile([]);
    process.exit(0); // Exit successfully even on error
  }
}

main();
