/**
 * ALNAV Messages Data
 *
 * Semper Gumby Mode - Awaiting SharePoint RSS Feed Integration
 * Source: Pending - https://www.mynavyhr.navy.mil/References/Messages/
 *
 * When RSS feed is available, this file will be auto-populated with live data.
 * For now, users should visit the MyNavyHR website directly.
 */

// ALNAV messages data structure - placeholder for RSS integration
const ALNAV_MESSAGES = [
  {
    "id": "ALNAV-PENDING",
    "title": "Semper Gumby - ALNAV Feed Pending",
    "subject": "ALNAV messages feed is being configured. Visit MyNavyHR for current messages.",
    "link": "https://www.mynavyhr.navy.mil/References/Messages/",
    "pubDate": new Date().toISOString(),
    "description": "ALNAV messages will be available once SharePoint RSS feed access is configured. Click to visit MyNavyHR directly."
  }
];

// Metadata
const ALNAV_META = {
  sourceUrl: 'https://www.mynavyhr.navy.mil/References/Messages/',
  generatedAt: new Date().toISOString(),
  totalRecords: 0,
  yearsCovered: [],
  lastUpdate: new Date().toISOString(),
  note: 'Semper Gumby - Awaiting RSS feed integration',
  status: 'pending_rss'
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
