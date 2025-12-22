# Message Watch

A web-based application for monitoring military directives, messages, and publications from multiple sources.

Created by [Semper Admin](https://semperadmin.com).

## Features

### Message Types
- **MARADMIN**: Marine Administrative Messages from Marines.mil
- **NAVADMIN**: Navy Administrative Messages from MyNavyHR
- **ALNAV**: All Navy Messages (placeholder - awaiting RSS feed)
- **SECNAV**: Secretary of the Navy Instructions (placeholder - awaiting RSS feed)
- **JTR**: Joint Travel Regulations updates from travel.dod.mil

### Core Functionality
- **Live RSS Feeds**: Fetches latest messages from official sources
- **Advanced Search**: Search by message ID, subject, or keywords
- **Date Filtering**: Quick filter buttons (Today, This Week, 2 Weeks, This Month, 60/90/180 Days, All)
- **Offline Support**: Works offline with cached data via service worker
- **Dark Theme**: Toggle between light and dark modes with persistence

### User Experience
- Modern, responsive design
- Mobile-friendly interface with optimized button layouts
- Real-time search and filtering
- Clear visual hierarchy for messages
- Direct links to source documents
- Installable as a Progressive Web App (PWA)

## Technical Details

### Architecture
- **Frontend-only**: Pure HTML/CSS/JavaScript (no backend required)
- **CORS Handling**: Automatic fallback through multiple CORS proxies
- **Data Storage**: LocalStorage for caching and offline support
- **RSS Parsing**: DOM Parser for XML processing
- **PWA**: Service worker for offline functionality and fast repeat loads

### CORS Proxy Fallbacks
The app automatically tries multiple CORS proxies in order:
1. Direct fetch (if CORS is enabled)
2. corsproxy.io
3. allorigins.win
4. cors-anywhere.herokuapp.com
5. codetabs.com

Each proxy has a 15-second timeout before trying the next one.

### Performance
- Proxy preference caching for faster loads
- Service worker caching for offline access
- Optimized bundle with Vite

## Usage

### Basic Usage
1. Open the app in a modern web browser
2. Select a message type tab (MARADMIN, NAVADMIN, JTR, etc.)
3. Use the search box to find specific messages
4. Select a date range with the filter buttons
5. Click "Refresh" to fetch the latest messages

### Search Tips
- Search by message ID: `123/24`
- Search by keywords: `promotion`, `travel`, etc.
- Search is case-insensitive across ID, subject, and description

### Installing as PWA
- **Mobile**: Tap "Add to Home Screen" in browser menu
- **Desktop**: Click install icon in address bar (Chrome/Edge)

## Data Sources

| Type | Source |
|------|--------|
| MARADMIN | Marines.mil RSS Feed |
| NAVADMIN | MyNavyHR RSS Feed |
| JTR | travel.dod.mil RSS Feed |
| ALNAV | Pending RSS access |
| SECNAV | Pending RSS access |

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Files

- `index.html` - Main HTML structure
- `app.js` - JavaScript application logic
- `style.css` - Styles and themes
- `manifest.json` - PWA manifest
- `service-worker.js` - Offline caching
- `lib/` - Static data files for placeholder feeds

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

## Credits

Inspired by [navadmin-scanner](https://github.com/mpyne-navy/navadmin-scanner) by mpyne-navy.

## License

This is an unofficial tool not affiliated with the United States Marine Corps, United States Navy, or Department of Defense.
