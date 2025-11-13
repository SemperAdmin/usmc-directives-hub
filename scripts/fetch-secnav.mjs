#!/usr/bin/env node

/**
 * Fetch SECNAV Directives from Navy Website
 *
 * This script fetches SECNAV directives from the Navy DONI SharePoint site
 * and generates a static JavaScript data file for use in the application.
 *
 * Source: https://www.secnav.navy.mil/doni/SECNAV%20Manuals1/Forms/AllItems.aspx
 * Target: lib/secnav-data.js
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SECNAV_URL = 'https://www.secnav.navy.mil/doni/SECNAV%20Manuals1/Forms/AllItems.aspx?View=%7B71bc9fed-cda6-4e2a-b781-43a972cc6a98%7D&SortField=Effective_x0020_Date&SortDir=Desc';
const SECNAV_BASE_URL = new URL(SECNAV_URL).origin; // Extract base URL for building full links
const OUTPUT_FILE = join(__dirname, '../lib/secnav-data.js');

// Browser headers for fetch requests (mimics real browser)
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

/**
 * Try multiple fetch methods with fallbacks
 */
async function tryMultipleFetchMethods(url) {
  console.log('[SECNAV] Trying multiple fetch methods...');

  const methods = [
    // Method 1: Direct fetch with comprehensive headers
    async () => {
      console.log('[SECNAV] Method 1: Direct fetch');
      const response = await fetch(url, { headers: BROWSER_HEADERS });
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

    // Method 3: ThingProxy
    async () => {
      console.log('[SECNAV] Method 3: ThingProxy');
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
      console.log(`[SECNAV] ✓ Success with method ${i + 1}`);
      return html;
    } catch (error) {
      console.log(`[SECNAV] ✗ Method ${i + 1} failed:`, error.message);
      if (i === methods.length - 1) {
        throw new Error('All fetch methods failed');
      }
    }
  }
}

/**
 * Parse SharePoint page and extract SECNAV directives
 */
async function fetchSecnavDirectives() {
  console.log('[SECNAV] Fetching data from Navy website...');
  console.log('[SECNAV] URL:', SECNAV_URL);

  try {
    // Fetch HTML
    const html = await tryMultipleFetchMethods(SECNAV_URL);

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    const directives = [];

    // SharePoint typically uses specific classes or table structures
    // Try multiple selectors to find the data table
    const possibleSelectors = [
      'table.ms-listviewtable tr',  // Standard SharePoint list view
      'table[summary*="SECNAV"] tr', // Table with SECNAV in summary
      '.ms-listviewgrid tr',         // Grid view
      'table tr',                    // Fallback: any table row
      '[role="row"]'                 // ARIA role for rows
    ];

    let rows = null;
    for (const selector of possibleSelectors) {
      const foundRows = $(selector);
      if (foundRows.length > 0) {
        console.log(`[SECNAV] Found ${foundRows.length} rows using selector: ${selector}`);
        rows = foundRows;
        break;
      }
    }

    if (!rows || rows.length === 0) {
      console.warn('[SECNAV] No table rows found in HTML');
      return [];
    }

    // Process each row
    rows.each((index, element) => {
      try {
        const $row = $(element);

        // Skip header rows
        if ($row.find('th').length > 0) return;

        // Try to extract data from cells
        const cells = $row.find('td');
        if (cells.length === 0) return;

        // Try to find link (SECNAV directive link)
        const link = $row.find('a[href*=".pdf"]').first().attr('href') ||
                    $row.find('a[href*="SECNAV"]').first().attr('href') ||
                    $row.find('a').first().attr('href');

        if (!link) return; // Skip rows without links

        // Extract title/name from link text or nearby text
        const title = $row.find('a').first().text().trim() ||
                     cells.first().text().trim();

        if (!title) return; // Skip rows without title

        // Build full URL if relative (derive base URL from SECNAV_URL constant)
        const fullLink = link.startsWith('http') ? link : `${SECNAV_BASE_URL}${link}`;

        // Extract SECNAV ID from title or filename
        const idMatch = title.match(/SECNAV[\s\-_]*[\d.]+[A-Z]*/i) ||
                       link.match(/SECNAV[\s\-_]*[\d.]+[A-Z]*/i);
        const id = idMatch ? idMatch[0].replace(/[\s\-_]+/g, ' ').toUpperCase() : title.substring(0, 50);

        // Try to find effective date (look for date patterns in cells)
        let effectiveDate = null;
        cells.each((i, cell) => {
          const cellText = $(cell).text().trim();
          // Match dates like "01/15/2024", "2024-01-15", "15 Jan 2024"
          const dateMatch = cellText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/);
          if (dateMatch && !effectiveDate) {
            effectiveDate = dateMatch[0];
          }
        });

        // Parse date. Fallback to epoch date if invalid to avoid incorrect sorting.
        let pubDateObj = null;
        if (effectiveDate) {
          const parsedDate = new Date(effectiveDate);
          if (!isNaN(parsedDate.getTime())) {
            pubDateObj = parsedDate;
          } else {
            console.warn(`[SECNAV] Invalid effective date found: "${effectiveDate}" for title: "${title}"`);
          }
        }

        // Create subject line
        const subject = title.replace(/SECNAV[\s\-_]*[\d.]+[A-Z]*\s*[-:]?\s*/i, '').trim() || title;

        // Extract description from additional cells
        const description = cells.slice(1).map(el => $(el).text().trim()).filter(t => t).join(' - ').substring(0, 500);

        directives.push({
          id,
          title,
          subject,
          link: fullLink,
          pubDate: (pubDateObj || new Date(0)).toISOString(), // Use epoch date as fallback
          description,
          effectiveDate: effectiveDate || null
        });
      } catch (rowError) {
        // Skip problematic rows
        console.warn(`[SECNAV] Error processing row ${index}:`, rowError.message);
      }
    });

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
 * Auto-generated from Navy DONI SharePoint Site
 * Source: ${SECNAV_URL}
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
  sourceUrl: '${SECNAV_URL}',
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
