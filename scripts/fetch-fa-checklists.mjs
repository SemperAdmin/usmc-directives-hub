#!/usr/bin/env node

/**
 * Fetch FA Checklists from IGMC Website
 *
 * This script scrapes the IGMC Inspections Division Checklists page
 * and generates a static JavaScript data file for use in the application.
 *
 * Source: https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/
 * Target: lib/fa-checklists.js
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_URL = 'https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/';
const OUTPUT_FILE = join(__dirname, '../lib/fa-checklists.js');

/**
 * Try multiple fetch methods with fallbacks
 */
async function tryMultipleFetchMethods(url) {
  console.log('[FA Checklists] Trying multiple fetch methods...');

  const methods = [
    // Method 1: Direct fetch with comprehensive headers
    async () => {
      console.log('[FA Checklists] Method 1: Direct fetch with browser headers');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 2: AllOrigins CORS proxy
    async () => {
      console.log('[FA Checklists] Method 2: AllOrigins CORS proxy');
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return json.contents;
    },

    // Method 3: CORS.io proxy
    async () => {
      console.log('[FA Checklists] Method 3: CORS.io proxy');
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 4: CodeTabs proxy
    async () => {
      console.log('[FA Checklists] Method 4: CodeTabs proxy');
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    },

    // Method 5: ThingProxy
    async () => {
      console.log('[FA Checklists] Method 5: ThingProxy');
      const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  ];

  // Try each method until one succeeds
  for (let i = 0; i < methods.length; i++) {
    try {
      const html = await methods[i]();
      console.log(`[FA Checklists] ✓ Success with method ${i + 1}`);
      return html;
    } catch (error) {
      console.log(`[FA Checklists] ✗ Method ${i + 1} failed:`, error.message);
      if (i === methods.length - 1) {
        throw new Error('All fetch methods failed');
      }
    }
  }
}

/**
 * Fetch and parse FA Checklists from IGMC website
 */
async function fetchFAChecklists() {
  console.log('[FA Checklists] Fetching data from IGMC...');
  console.log('[FA Checklists] URL:', SOURCE_URL);

  try {
    // Dynamic import of cheerio (ESM)
    const cheerio = await import('cheerio');

    // Try multiple fetch methods
    const html = await tryMultipleFetchMethods(SOURCE_URL);
    const $ = cheerio.load(html);

    // Find the table with class JCSDashboard
    const table = $('.JCSDashboard');

    if (!table.length) {
      console.warn('[FA Checklists] Warning: JCSDashboard table not found on page');
      return [];
    }

    const checklists = [];

    // Parse table rows from tbody
    table.find('tbody tr').each((index, row) => {
      const cells = $(row).find('td');

      if (cells.length >= 5) {
        const functionalArea = $(cells[0]).text().trim();
        const category = $(cells[1]).text().trim();
        const faNumber = $(cells[2]).text().trim();
        const sponsor = $(cells[3]).text().trim();
        const effectiveDate = $(cells[4]).text().trim();

        // Only add if we have at least an FA Number
        if (faNumber) {
          checklists.push({
            functionalArea,
            category,
            faNumber,
            sponsor,
            effectiveDate
          });
        }
      }
    });

    console.log(`[FA Checklists] Successfully parsed ${checklists.length} checklists`);
    return checklists;

  } catch (error) {
    console.error('[FA Checklists] Error fetching data:', error.message);
    console.error('[FA Checklists] Returning empty array (graceful degradation)');
    return [];
  }
}

/**
 * Generate JavaScript data file
 */
async function generateDataFile(checklists) {
  const timestamp = new Date().toISOString();

  const fileContent = `/**
 * FA Checklists Data
 *
 * Auto-generated from IGMC Inspections Division Checklists
 * Source: ${SOURCE_URL}
 * Generated: ${timestamp}
 * Total Records: ${checklists.length}
 *
 * This file is automatically generated by scripts/fetch-fa-checklists.mjs
 * DO NOT EDIT MANUALLY
 */

// FA Checklist data structure
const FA_CHECKLISTS = ${JSON.stringify(checklists, null, 2)};

// Metadata
const FA_CHECKLISTS_META = {
  sourceUrl: '${SOURCE_URL}',
  generatedAt: '${timestamp}',
  totalRecords: ${checklists.length},
  lastUpdate: '${timestamp}'
};

// Export for use in application
if (typeof window !== 'undefined') {
  window.FA_CHECKLISTS = FA_CHECKLISTS;
  window.FA_CHECKLISTS_META = FA_CHECKLISTS_META;
}

// Also support module exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FA_CHECKLISTS,
    FA_CHECKLISTS_META
  };
}
`;

  await writeFile(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`[FA Checklists] Data file written to: ${OUTPUT_FILE}`);
  console.log(`[FA Checklists] Total records: ${checklists.length}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('[FA Checklists] Starting fetch process...');

  try {
    const checklists = await fetchFAChecklists();
    await generateDataFile(checklists);
    console.log('[FA Checklists] ✓ Complete');
    process.exit(0);
  } catch (error) {
    console.error('[FA Checklists] Fatal error:', error);
    // Still generate an empty file for graceful degradation
    await generateDataFile([]);
    process.exit(0); // Exit successfully even on error
  }
}

main();
