# Known Technical Debt & Future Improvements

This document tracks known technical debt and areas for future improvement.

## Global State Management (High Priority)

### Issue
The application currently uses 14 global variables for state management:

```javascript
// Globals defined in .eslintrc.json
let allMaradmins = [];
let allMcpubs = [];
let allAlnavs = [];
let allAlmars = [];
let allSemperAdminPosts = [];
let allDodForms = [];
let allIgmcChecklists = [];
let allYouTubePosts = [];
let allSecnavs = [];
let allJtrs = [];
let allDodFmr = [];
let currentMessages = [];
let summaryCache = {};
let currentMessageType = 'maradmin';
```

### Problems
1. **Difficult to reason about** - Any part of the code can modify global state
2. **Hard to debug** - Changes to state can come from anywhere
3. **Coupling** - Functions implicitly depend on global variables
4. **Testing** - Difficult to test functions in isolation
5. **Scalability** - Anti-pattern that becomes worse as app grows

### Recommended Solutions

#### Short-term (Easy Win)
Encapsulate globals into a single state object:

```javascript
window.appState = {
  messages: {
    maradmins: [],
    mcpubs: [],
    alnavs: [],
    almars: [],
    semperAdminPosts: [],
    dodForms: [],
    igmcChecklists: [],
    youTubePosts: [],
    secnavs: [],
    jtrs: [],
    dodFmr: [],
    current: [],
  },
  ui: {
    currentMessageType: 'maradmin',
  },
  cache: {
    summaries: {},
  }
};
```

**Benefits:**
- Single point of reference for all state
- Easier to inspect in console: `console.log(appState)`
- Clear namespace prevents conflicts
- First step toward better architecture

#### Medium-term (Modular Pattern)
Create state management modules:

```javascript
// state/messages.js
export const messageState = {
  maradmins: [],
  mcpubs: [],
  // ...

  getByType(type) { return this[type] || []; },
  setByType(type, data) { this[type] = data; },
  clear() { /* ... */ }
};

// state/ui.js
export const uiState = {
  currentMessageType: 'maradmin',

  setMessageType(type) { this.currentMessageType = type; },
  getMessageType() { return this.currentMessageType; }
};
```

**Benefits:**
- Encapsulation with methods
- Clear API for state access
- Easier to test individual modules
- Can add validation/logging to setters

#### Long-term (State Management Library)
Consider lightweight state management:

**Option 1: Zustand** (~1KB)
```javascript
import create from 'zustand';

const useStore = create((set) => ({
  messages: { maradmins: [], mcpubs: [] /* ... */ },
  currentMessageType: 'maradmin',

  setMessages: (type, data) => set((state) => ({
    messages: { ...state.messages, [type]: data }
  })),

  setMessageType: (type) => set({ currentMessageType: type })
}));
```

**Option 2: Valtio** (~1KB, proxy-based)
```javascript
import { proxy, useSnapshot } from 'valtio';

const state = proxy({
  messages: { maradmins: [], mcpubs: [] },
  currentMessageType: 'maradmin'
});

// Direct mutations work
state.messages.maradmins = newData;
```

**Benefits:**
- Reactive updates
- Built-in devtools
- TypeScript support
- Industry-standard patterns

### Migration Path

1. **Phase 1** (1-2 hours): Encapsulate into `window.appState`
   - Update all variable references
   - Keep same architecture
   - Immediate improvement in debuggability

2. **Phase 2** (4-6 hours): Create state modules
   - Break into message, ui, cache modules
   - Add getter/setter methods
   - Add basic validation

3. **Phase 3** (8-12 hours): Implement proper state management
   - Choose library (Zustand recommended for size)
   - Migrate module by module
   - Add reactive subscriptions
   - Implement undo/redo if needed

### Current Status

**Status:** Documented as technical debt

**ESLint Configuration:** Globals defined in `.eslintrc.json` to prevent linting errors. This is acceptable short-term but should not be considered a permanent solution.

**Recommendation:** Plan Phase 1 refactoring for next major version (v2.0.0)

---

## Other Technical Debt Items

### Code Organization
- **Issue:** `app.js` is 3,500+ lines
- **Solution:** Split into modules when implementing state management
- **Priority:** Medium

### TypeScript Migration
- **Issue:** No type safety
- **Solution:** Gradual migration to TypeScript
- **Priority:** Low (works well with vanilla JS)

### Testing
- **Issue:** No unit tests
- **Solution:** Add Vitest + testing library
- **Priority:** Medium

### Accessibility
- **Issue:** Missing ARIA labels, keyboard nav
- **Solution:** WCAG 2.1 AA compliance audit
- **Priority:** Medium

---

**Last Updated:** 2025-11-16

**Note:** This technical debt is intentional and documented. The current global variable approach works for the application's current scale but should be addressed before major feature additions.
