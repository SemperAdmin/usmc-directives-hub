# MARADMIN Scanner

A web-based application for scanning, searching, and tracking Marine Corps Administrative Messages (MARADMINs) from Marines.mil.

Inspired by the [navadmin-scanner](https://github.com/mpyne-navy/navadmin-scanner) project for Navy messages.

## Features

### Core Functionality
- **Live RSS Feed**: Fetches latest MARADMINs from Marines.mil RSS feed
- **Advanced Search**: Search by MARADMIN ID, subject, or keywords
- **Date Filtering**: Filter messages by date range (7, 14, 30, 60, 90 days, or all)
- **Offline Cache**: Works offline with cached data
- **JSON Export**: Export filtered results to JSON format

### Enhanced Parsing
- Extracts MARADMIN ID and numeric ID
- Parses subject line from title
- Captures full description and category
- Builds searchable index for fast filtering

### User Experience
- Modern, responsive design
- Dark theme support with persistence
- Real-time search and filtering
- Clear visual hierarchy for messages
- Direct links to full messages on Marines.mil
- Mobile-friendly interface

## Technical Details

### Architecture
- **Frontend-only**: Pure HTML/CSS/JavaScript (no backend required)
- **CORS Handling**: Automatic fallback through multiple CORS proxies
- **Data Storage**: LocalStorage for caching and offline support
- **RSS Parsing**: DOM Parser for XML processing

### CORS Proxy Fallbacks
The app automatically tries multiple CORS proxies in order:
1. Direct fetch (if CORS is enabled)
2. corsproxy.io
3. allorigins.win
4. cors-anywhere.herokuapp.com
5. codetabs.com

Each proxy has a 15-second timeout before trying the next one.

## Usage

### Basic Usage
1. Open `index.html` in a modern web browser
2. The app automatically loads cached data and fetches new MARADMINs
3. Use the search box to find specific messages
4. Select a date range to filter results
5. Click "Refresh" to fetch the latest messages
6. Click "Export JSON" to download current results

### Search Tips
- Search by MARADMIN ID: `123/24`
- Search by keywords: `promotion`, `deployment`, etc.
- Search is case-insensitive and searches across ID, subject, and description

### Troubleshooting

**If you see "Fetch failed" errors:**
- The app tries multiple CORS proxies automatically
- First load may take 10-30 seconds while trying different proxies
- Once data is cached, the app works offline
- Try the Refresh button if the initial load fails
- Check the browser console (F12) for detailed error messages

**If no data loads:**
- Check your internet connection
- The Marines.mil RSS feed may be temporarily unavailable
- CORS proxies may be down (they rotate automatically)
- Clear your browser cache and try again

## Comparison to navadmin-scanner

### navadmin-scanner (Navy)
- Perl-based backend with Mojolicious framework
- Scans and downloads NAVADMIN messages
- Parses messages into structured JSON
- Provides web viewer interface
- Server-side processing

### MARADMIN Scanner (This Project)
- Frontend-only JavaScript application
- Fetches from Marines.mil RSS feed
- Client-side parsing and filtering
- Modern responsive UI
- No server required

## Data Source

MARADMINs are fetched from the official Marines.mil RSS feed:
```
https://www.marines.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=6&Site=481&max=50&category=14336
```

## Files

- `index.html` - Main HTML structure
- `app.js` - JavaScript application logic
- `style.css` - Styles and themes
- `README.md` - This file

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

## Future Enhancements

Potential improvements inspired by navadmin-scanner:
- PDF parsing support (if Marines.mil switches to PDFs)
- Full message content extraction
- Automatic hyperlink detection in messages
- Message archiving and historical search
- Advanced filtering (by category, keywords, etc.)
- URL-based deep linking to specific messages

## Credits

Inspired by [navadmin-scanner](https://github.com/mpyne-navy/navadmin-scanner) by mpyne-navy.

## License

This is an unofficial tool not affiliated with the United States Marine Corps or Department of Defense.
