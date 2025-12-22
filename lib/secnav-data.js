/**
 * SECNAV Directives Data
 *
 * Semper Gumby Mode - Awaiting SharePoint RSS Feed Integration
 * Source: Pending - https://www.secnav.navy.mil/doni/
 *
 * When RSS feed is available, this file will be auto-populated with live data.
 * For now, users should visit the DONI website directly.
 */

// SECNAV directives data structure - placeholder for RSS integration
const SECNAV_DIRECTIVES = [
  {
    "id": "SECNAV-PENDING",
    "title": "Semper Gumby - SECNAV Feed Pending",
    "subject": "SECNAV directives feed is being configured. Visit DONI website for current instructions.",
    "link": "https://www.secnav.navy.mil/doni/Directives/Forms/doniAllInstructions.aspx",
    "pubDate": new Date().toISOString(),
    "description": "SECNAV directives will be available once SharePoint RSS feed access is configured. Click to visit the DONI website directly.",
    "category": "System Notice",
    "effectiveDate": new Date().toISOString().split('T')[0]
  }
];

// Metadata
const SECNAV_META = {
  sourceUrl: 'https://www.secnav.navy.mil/doni/Directives/Forms/doniAllInstructions.aspx',
  generatedAt: new Date().toISOString(),
  totalRecords: 0,
  categories: [],
  lastUpdate: new Date().toISOString(),
  note: 'Semper Gumby - Awaiting RSS feed integration',
  status: 'pending_rss'
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
