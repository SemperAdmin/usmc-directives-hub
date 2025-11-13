# FA Checklists Data Fetching Scripts

This directory contains scripts for fetching and updating FA Checklists data from the IGMC website.

## Overview

The FA Checklists feature uses a **build-time data generation** approach combined with **automated scheduled updates** via GitHub Actions.

## Scripts

### `fetch-fa-checklists.mjs`

Main script that fetches FA Checklists data from the IGMC Inspections Division website.

**Features:**
- Multiple fetch method fallbacks (5 different approaches)
- Parses HTML table with class `.JCSDashboard`
- Extracts 5 columns: Functional Area, Category, FA Number, Sponsor, Effective Date
- Generates static JavaScript file: `lib/fa-checklists.js`
- Graceful error handling (returns empty array on failure)

**Usage:**
```bash
# Manually fetch and update data
npm run fetch-fa

# Runs automatically before build
npm run prebuild
```

**Fetch Methods (in order):**
1. **Direct fetch** with comprehensive browser headers
2. **AllOrigins CORS proxy** (api.allorigins.win)
3. **CORS.io proxy** (corsproxy.io)
4. **CodeTabs proxy** (api.codetabs.com)
5. **ThingProxy** (thingproxy.freeboard.io)

The script tries each method sequentially until one succeeds.

### `test-fetch-methods.mjs`

Diagnostic script that tests all fetch methods and reports results.

**Usage:**
```bash
node scripts/test-fetch-methods.mjs
```

**Output:**
- Tests each fetch method independently
- Validates fetched content
- Provides summary of working methods
- Useful for troubleshooting fetch issues

## Automated Updates

### GitHub Actions Workflow

The `.github/workflows/update-fa-checklists.yml` workflow runs automatically:

**Schedule:**
- Daily at 6:00 AM UTC (1:00 AM EST / 10:00 PM PST)
- Can be triggered manually from GitHub Actions tab

**Process:**
1. Checkout repository
2. Install Node.js dependencies
3. Run fetch script (`npm run fetch-fa`)
4. Check if data changed
5. If changed:
   - Extract record count
   - Commit updated `lib/fa-checklists.js`
   - Push to main branch
6. Create workflow summary

**Benefits:**
- ✅ Fully automated - no manual intervention needed
- ✅ Only commits when data actually changes
- ✅ Runs in GitHub's infrastructure (better network access)
- ✅ Provides detailed logs and summaries
- ✅ Skips CI on data commits (`[skip ci]`)

## Data Structure

Generated file: `lib/fa-checklists.js`

```javascript
const FA_CHECKLISTS = [
  {
    functionalArea: "Aircraft Rescue and Fire Fighting (ARFF) (6500)",
    category: "Non-CoRE",
    faNumber: "6500",
    sponsor: "DC A (EAF,EOS, APX)",
    effectiveDate: "5/15/2025"
  },
  // ... more checklists
];

const FA_CHECKLISTS_META = {
  sourceUrl: "https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/",
  generatedAt: "2025-11-13T05:21:15.737Z",
  totalRecords: 42,
  lastUpdate: "2025-11-13T05:21:15.737Z"
};
```

## Troubleshooting

### All Fetch Methods Fail

If all methods fail, the IGMC website may be:
- Down or under maintenance
- Blocking automated requests
- Changed their HTML structure

**Solutions:**
1. Check if website is accessible manually
2. Review GitHub Actions workflow logs
3. Try manual trigger from Actions tab
4. Contact IGMC for API access or RSS feed

### Data Not Updating

**Check:**
1. GitHub Actions workflow runs (Actions tab)
2. Workflow logs for errors
3. Git commit history for automated commits
4. `lib/fa-checklists.js` modification date

### Testing Locally

```bash
# Test all fetch methods
node scripts/test-fetch-methods.mjs

# Test actual fetch
npm run fetch-fa

# Check generated file
cat lib/fa-checklists.js
```

## Manual Data Update

If automated updates fail, you can manually update the data:

1. Visit: https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/
2. Copy table data
3. Update `lib/fa-checklists.js` following the structure
4. Update `totalRecords` in `FA_CHECKLISTS_META`
5. Commit and push

## Architecture

```
┌─────────────────────────────────────┐
│  GitHub Actions (Scheduled)         │
│  Runs: Daily @ 6 AM UTC             │
└─────────────┬───────────────────────┘
              │
              ├─ Install Dependencies
              ├─ Run fetch-fa-checklists.mjs
              ├─ Parse IGMC Table
              │  └─ Try 5 fetch methods
              ├─ Generate lib/fa-checklists.js
              ├─ Detect Changes
              └─ Commit & Push (if changed)
                     │
                     ▼
              ┌──────────────────┐
              │  Main Branch     │
              │  Updated Data    │
              └──────────────────┘
                     │
                     ▼
              ┌──────────────────┐
              │  Deployment      │
              │  (GitHub Pages)  │
              └──────────────────┘
```

## Source

- **Website**: https://www.igmc.marines.mil/Divisions/Inspections-Division/Checklists/
- **Table Class**: `.JCSDashboard`
- **Update Frequency**: Daily (automated)
