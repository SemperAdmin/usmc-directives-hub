# Static Data Files Maintenance

This project uses pre-populated static data files for SECNAV, ALNAV, and IGMC data sources that cannot be fetched at runtime due to CORS restrictions.

## Files

- `lib/secnav-data.js` - SECNAV Directives
- `lib/alnav-data.js` - ALNAV Messages
- `lib/fa-checklists.js` - IGMC Functional Area Checklists

## Why Static Files?

These data sources:
1. Don't have CORS-enabled APIs
2. Can't be fetched in the browser
3. Are too slow to scrape on every page load
4. Can't be fetched in GitHub Actions (network restrictions)

## How to Update

### Quick Update (All Sources)
```bash
npm run fetch-all
git add lib/*.js
git commit -m "chore: Update static data files"
git push
```

### Individual Updates
```bash
# FA Checklists (IGMC)
npm run fetch-fa

# SECNAV Directives
npm run fetch-secnav

# ALNAV Messages
npm run fetch-alnav
```

### Verify Updates
```bash
# Check record counts
grep "Total Records" lib/*.js

# Should show something like:
# lib/alnav-data.js: * Total Records: 150
# lib/fa-checklists.js: * Total Records: 45
# lib/secnav-data.js: * Total Records: 200
```

## Troubleshooting

### All Fetches Return 0 Records
**Cause:** Network restrictions or CORS proxy failures

**Solution:** Scripts have multiple fallback proxies. If all fail:
1. Check your internet connection
2. Try again later (proxies may be rate-limited)
3. Check if the source websites are accessible

### Specific Source Fails
Each script has its own fallback mechanism:
- **FA Checklists:** 5 fallback proxies
- **SECNAV:** 3 fallback proxies
- **ALNAV:** Uses proxy server endpoint

If a specific source consistently fails:
1. Check the source URL is still valid
2. Inspect the HTML structure (may have changed)
3. Update the script in `scripts/fetch-*.mjs`

## Update Frequency

**Recommended:** Update monthly or when you notice missing data

**Why not automatic?**
- Source websites update irregularly
- Scripts can fail due to external dependencies
- Manual verification ensures data quality

## GitHub Actions

The fetch scripts are **disabled** in GitHub Actions (`.github/workflows/deploy-github-pages.yml`) because:
1. GitHub Actions blocks external network requests
2. Proxies are unreliable in CI environments
3. Fetch failures would break deployments

**Result:** The build uses the committed static files from `lib/` directory.

## Adding New Static Data Sources

If you need to add a new static data source:

1. Create a fetch script in `scripts/fetch-yourdata.mjs`
2. Follow the pattern from existing scripts:
   - Multiple fallback proxies
   - Cheerio for HTML parsing
   - Graceful degradation (empty array on failure)
3. Generate a static file in `lib/yourdata.js`
4. Add npm script to `package.json`
5. Load in `app.js` at startup
6. Document here

## Dependencies

The fetch scripts require:
- `cheerio` - HTML parsing
- `xml2js` - XML/RSS parsing (for potential RSS sources)

Install with: `npm install`
