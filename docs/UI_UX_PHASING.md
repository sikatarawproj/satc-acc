# SATC Wholesale Sales — UI/UX Phasing Plan (Phase 8–14)

> **Current baseline:** Phase 13-light — Most of original DESIGN_PHASING.md (Phases 1-7) is implemented. This plan builds on that foundation with performance, architecture, UX depth, and quality.

---

## Phase 8: Code Architecture & Monolith Decomposition (Days 1-4)
Goal: Break the 21K-line single file into maintainable modules without changing functionality

### Day 1 — CSS Extraction & Cleanup
- Extract inline `<style>` blocks into separate CSS files:
  - `assets/css/tokens.css` — design tokens, theme vars
  - `assets/css/components.css` — SaaS component library (`.btn-saas`, `.card-saas`, `.input-saas`, `.badge-saas`, `.table-saas`, `.avatar-saas`, `.metric-saas`, `.progress-saas`)
  - `assets/css/layout.css` — sidebar, topbar, app-shell, responsive breakpoints
  - `assets/css/modules.css` — section-specific styles (summary, encode, SOA, aging, settings, account, audit)
  - `assets/css/print.css` — print stylesheet
- Remove `!important` cascade debt by restructuring selector specificity
- Eliminate duplicate CSS (e.g., multiple `.app-sidebar.open` definitions across different phase blocks)

### Day 2 — JavaScript Modularization
- Extract inline `<script>` into separate files:
  - `assets/js/state.js` — state object, constants, storage keys
  - `assets/js/permissions.js` — role/permission system
  - `assets/js/utils.js` — utility functions (formatCurrency, parseDate, escapeHtml, etc.)
  - `assets/js/auth.js` — login, logout, session, profile
  - `assets/js/navigation.js` — setActiveTab, sidebar, topbar, routing
  - `assets/js/summary.js` — dashboard, KPI cards, charts, sales table
  - `assets/js/encode.js` — 4-step encoding wizard
  - `assets/js/soa.js` — statement of account
  - `assets/js/aging.js` — aging report
  - `assets/js/settings.js` — settings, backup, import
  - `assets/js/accounts.js` — account management
  - `assets/js/audit.js` — audit trail
  - `assets/js/theme.js` — light/dark toggle
  - `assets/js/toast.js` — toast notification system
- Use IIFE or module pattern to avoid global namespace pollution

### Day 3 — Build Pipeline Setup
- Add `package.json` bundler script (esbuild or Vite)
- Configure CSS compilation: `npx esbuild assets/js/*.js --bundle --outdir=dist`
- Add sourcemaps for debugging
- Set up development server with hot reload
- Configure `vercel.json` to serve from `dist/`

### Day 4 — Performance Audit & Optimization
- **Lazy loading**: Defer non-critical JS modules until section is first activated
- **Debounce**: search inputs, resize handlers, scroll events
- **Canvas chart optimization**: Throttle re-renders, use `requestAnimationFrame`
- **CSS audit**: Remove unused CSS rules, merge duplicate media queries
- **Load time**: Measure DOMContentLoaded, identify bottlenecks
- **localStorage**: Audit storage reads/writes, add cache layer

---

## Phase 9: UX Consistency & Interaction Polish (Days 5-7)
Goal: Eliminate UX inconsistencies, add micro-interactions, improve feedback

### Day 5 — Loading & Empty States
- **Skeleton loaders**: Add placeholder shimmer animations for all data tables (Summary, SOA, Aging, Audit, Accounts)
- **Empty states**: Replace bare "No data" text with illustrated empty states (SVG illustrations + action prompts) for:
  - Sales Summary (no transactions match filter)
  - Encoding (no products added yet)
  - SOA (no transactions for selected customer)
  - Aging (no overdue items)
  - Audit (no activity recorded)
  - Accounts (no accounts created)
- **Error states**: Add inline error banners with retry buttons for API failures
- **Loading spinners**: Consistent spinner component for all async operations (login, save, export, import)

### Day 6 — Micro-interactions & Animation
- **Page transitions**: Fade/slide transitions when switching sections via `setActiveTab`
- **Modal animations**: Add `@keyframes` scale + fade for modal open/close (currently no animation)
- **Toast improvements**: Add slide-in from right animation, stack positioning, progress bar for auto-dismiss
- **Counter animation**: Animate KPI numbers counting up on dashboard load
- **Button states**: Add loading spinner inside buttons during async operations, disable to prevent double-click
- **Row animations**: Staggered fade-in for table rows on page load

### Day 7 — Form UX Overhaul
- **Inline validation**: Real-time field validation with green check / red error icon on blur
- **Error messages**: Consistent inline error text below fields (currently missing in many forms)
- **Focus management**: Auto-focus first field on modal open, trap focus within modal, return focus on close
- **Tab order**: Audit and fix tab order across all forms
- **Character count**: Add for textarea fields (notes, reason fields)
- **Auto-save indicators**: Visual indicator showing "Saved" / "Saving..." / "Unsaved changes"
- **Undo support**: Add undo toast after destructive actions (delete row, cancel invoice)

---

## Phase 10: Advanced Data UX (Days 8-10)
Goal: Power-user features for handling 3K+ records efficiently

### Day 8 — Advanced Filtering & Search
- **Multi-select filters**: Allow selecting multiple document sections simultaneously
- **Date range presets**: Add "Today", "This Week", "This Month", "This Quarter", "This Year" quick buttons
- **Saved filters**: Allow saving filter presets per user (localStorage)
- **Search improvements**:
  - Add debounced search with minimum 2 chars (currently exists but no visual feedback)
  - Show search matches count
  - Highlight matched text in results
  - Add search history dropdown
- **Column visibility toggles**: Let users show/hide columns in tables (stored in localStorage)

### Day 9 — Virtual Scrolling & Pagination
- **Virtual scroll**: Implement virtual scrolling for the 3,336-record transaction table to improve rendering performance
- **Infinite scroll option**: Add toggle between paginated and infinite scroll modes
- **Pagination enhancement**:
  - "Go to page" input
  - Page size selector (10/25/50/100/all)
  - Show "Page X of Y" with total record count
  - Keyboard shortcuts: Left/Right arrows for prev/next page
- **Sticky headers**: Freeze table header row on scroll
- **Frozen columns**: Lock customer name and invoice number columns on horizontal scroll

### Day 10 — Export & Reporting UX
- **Export progress**: Show progress bar for large CSV/Excel exports with cancel option
- **Export presets**: Remember last export configuration (columns, format, filters)
- **Batch operations**: Multi-select checkboxes on tables with bulk actions:
  - Bulk status update
  - Bulk delete (with confirmation + reason prompt)
  - Bulk export selected
- **Report scheduling**: UI placeholder for scheduled report generation
- **Printable views**: Polish print layouts for all modules (SOA, Aging, Summary, Audit)
- **Audit export**: Add PDF export with company letterhead

---

## Phase 11: Mobile & Touch Experience (Days 11-12)
Goal: Field-worker-ready mobile experience with offline capability

### Day 11 — Mobile-First Refinement
- **Touch optimization**:
  - Increase all interactive elements to minimum 44×44px
  - Add swipe gestures: swipe left to delete/reveal actions on table rows
  - Pull-to-refresh on data tables (custom implementation)
  - Long-press context menu on mobile
- **Bottom navigation enhancement**:
  - Add active indicator animation
  - Show notification badge on Audit tab
  - Add haptic feedback simulation
- **Responsive tables**:
  - Card view alternative for tables on phones (label:value pairs instead of columns)
  - Horizontal scroll with visual scroll indicator (fade edges)
  - Collapsible row details (tap to expand/collapse)
- **Full-screen modals**: All modals go full-screen on <640px with slide-up animation

### Day 12 — Offline & Resilience
- **Offline detection**: Add online/offline status indicator in topbar
- **Service worker**: Cache app shell and assets for offline access
- **Queue writes**: Queue transactions created offline, sync when online
- **Conflict resolution**: UI for handling sync conflicts (last-write-wins with notification)
- **Connection quality**: Show connection quality indicator (fast/slow/offline)
- **Graceful degradation**: Degrade chart rendering to static data when offline
- **Storage quota**: Show localStorage usage warning when approaching limit

---

## Phase 12: Accessibility & Internationalization (Days 13-14)
Goal: WCAG 2.1 AA compliance and multi-language readiness

### Day 13 — Accessibility (a11y)
- **Screen reader support**:
  - Add `aria-label`, `aria-describedby`, `aria-live` regions to dynamic content
  - Announce filter results, toast messages, modal open/close
  - Proper heading hierarchy (h1-h6) in all sections
  - Add `role="status"` to toast region, `role="alert"` to error messages
- **Keyboard navigation**:
  - Full keyboard operability for all features (Tab, Enter, Escape, Arrow keys)
  - Visible focus indicators on all interactive elements (currently very subtle)
  - Skip-to-content link
  - Keyboard shortcut menu (show/hide with `?` key)
- **Color contrast**: Audit and fix all text/background combinations to meet WCAG AA (4.5:1 ratio)
- **Reduced motion**: Already has `prefers-reduced-motion` — extend to cover all animations
- **Focus trap**: Implement proper focus trapping in modals and dropdowns

### Day 14 — Internationalization (i18n)
- **Locale system**: Create `locales/` directory with JSON translation files
- **Text extraction**: Replace all hardcoded UI strings with function calls:
  - `__('dashboard.title')` → "Wholesale Sales Summary"
  - `__('common.save')` → "Save"
  - `__('invoice.status.paid')` → "PAID"
- **Currency**: Make currency symbol configurable (not hardcoded ₱)
- **Date formats**: Use `Intl.DateTimeFormat` instead of manual formatting
- **Number formats**: Use `Intl.NumberFormat` for locale-aware numbers
- **RTL support**: Add CSS logical properties (`margin-inline-start`, `padding-inline-end`) for future RTL layouts
- **Language selector**: Add language switcher in settings or topbar

---

## Phase 13: Design System Version 2 (Days 15-16)
Goal: Evolve the CSS token system into a full design system with documentation

### Day 15 — Design Token Audit & Expansion
- **Token audit**: Review all hardcoded color/size values in CSS, replace with tokens
- **Typography system**:
  - Define type scale (12/14/16/18/20/24/28/32/40px)
  - Define font weight tokens (400/500/600/700)
  - Define line-height tokens (1.2/1.4/1.5/1.6)
- **Spacing system**: Ensure consistent use of `--space-*` tokens everywhere
- **Elevation system**: Standardize shadow usage (card, modal, dropdown, tooltip, toast)
- **Animation tokens**: Define duration (fast/normal/slow) and easing (ease-in/out/in-out)
- **Breakpoint tokens**: Define as CSS custom properties for consistency

### Day 16 — Design System Documentation & Component Gallery
- **Living style guide**: Build a hidden `/style-guide` route that renders:
  - Color palette swatches
  - Typography scale specimens
  - Button variants gallery
  - Form element showcase
  - Card/panel variations
  - Table styles
  - Modal/dialog examples
  - Badge/pill options
  - Progress bar and metric cards
  - Toast/notification samples
- **Component usage docs**: Document each CSS component with HTML examples and intended use
- **Accessibility notes**: Add a11y requirements per component
- **Migration guide**: Document breaking changes between old and new class names

---

## Phase 14: Quality Assurance & Monitoring (Days 17-18)
Goal: Automated testing, error tracking, and performance monitoring

### Day 17 — Testing Infrastructure
- **Unit tests**: Set up Vitest or Jest for JS utility functions
  - `formatCurrency()`, `parseDate()`, `computeHeroSummary()`
  - Permission merging logic
  - Filter/sort functions
- **Integration tests**: Playwright or Cypress for critical flows:
  - Login/logout flow
  - Navigation (all sections accessible)
  - CRUD operations (create transaction, edit, cancel)
  - Filter and search functionality
  - Export CSV/Excel
  - Theme toggle persistence
- **Visual regression**: Percy or Chromatic for screenshot comparison after CSS changes
- **A11y tests**: axe-core integration for automated accessibility checks

### Day 18 — Monitoring & Error Handling
- **Error boundary**: Global error handler that catches unhandled exceptions and shows a friendly error screen with reload button
- **Console error monitoring**: Capture and log runtime errors to a ring buffer (accessible via debug mode)
- **Performance monitoring**: 
  - Track and log mount/update times for each section
  - Monitor localStorage quota usage
  - Track API call latency
  - Report Cumulative Layout Shift (CLS)
- **Debug mode**: Hidden debug panel (`Ctrl+Shift+D`) showing:
  - State inspector (live view of `state` object)
  - localStorage contents
  - Performance timings
  - Error log
  - Network request log
- **Telemetry placeholder**: Anonymous usage stats (section visits, feature usage) for future product decisions

---

## Implementation Priority

| Priority | Phase | Why |
|----------|-------|-----|
| **P0** | Phase 8 | Monolith decomposition unblocks everything else |
| **P1** | Phase 9 | UX consistency directly impacts daily user satisfaction |
| **P1** | Phase 10 | Power users need better data handling for 3K+ records |
| **P2** | Phase 11 | Mobile access for field workers is a stated requirement |
| **P2** | Phase 12 | Accessibility is a compliance and inclusion requirement |
| **P3** | Phase 13 | Design system v2 is valuable but not blocking |
| **P3** | Phase 14 | Testing is critical but can be incremental |

## Effort Summary

| Phase | Working Days | Focus |
|-------|-------------|-------|
| Phase 8 | 4 | Architecture, CSS/JS extraction, build pipeline |
| Phase 9 | 3 | UX consistency, animations, form polish |
| Phase 10 | 3 | Advanced data UX, filtering, export |
| Phase 11 | 2 | Mobile polish, offline resilience |
| Phase 12 | 2 | Accessibility, i18n |
| Phase 13 | 2 | Design system v2, documentation |
| Phase 14 | 2 | Testing, monitoring, error handling |
| **Total** | **18** | |
