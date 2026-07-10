# SATC Wholesale Sales — SaaS Design Phasing Plan

## Phase 1: Foundation (Days 1-3)
Goal: Establish design system components and core layout structure

Day 1 — Design Tokens & Base Components
- Define CSS custom properties for colors, typography, spacing
- Build button component set (primary, secondary, danger, ghost)
- Create input/select/textarea component library
- Establish card container with border, shadow, radius specs

Day 2 — Navigation Overhaul
- Rework sidebar: collapsible width, icon-only mode, active indicator bar
- Rebuild topbar: sticky positioning, breadcrumb display area, user avatar dropdown with menu
- Add notification bell icon with badge count placeholder

Day 3 — Responsive Foundation
- Mobile-first breakpoint system (480, 640, 768, 1024, 1280px)
- Sidebar becomes bottom navigation on phones
- Topbar collapses to minimal hamburger layout
- Content area adapts with proper padding scales

## Phase 2: Dashboard Revamp (Days 4-5)
Goal: Transform the landing page into a modern analytics hub

Day 4 — Metric Cards Enhancement
- Replace flat numbers with progress ring indicators
- Add animated counter effect on page load
- Include trend arrows (up/down) with percentage change
- Sparkline mini-charts inside each card

Day 5 — Charts & Filters
- Integrate lightweight chart library for bar/donut/line
- Build floating filter panel with backdrop-blur glass effect
- Add date range selector with preset options (This Week, This Month, etc.)
- Create illustrated empty state component for no-data scenarios

## Phase 3: Data Tables Upgrade (Days 6-7)
Goal: Professional-grade data display across all list views

Day 6 — Table Core
- Column header sorting with directional arrows
- Inline filter chips above the table area
- Checkbox column for multi-select operations
- Row hover highlighting with subtle color shift

Day 7 — Table Actions & Pagination
- Three-dot action menu per row (view, edit, delete)
- Bulk action toolbar appears on multi-select
- Page navigation with numbered buttons and page size selector
- Export dropdown (CSV, Excel, PDF) in table header

## Phase 4: Forms & Modals (Days 8-9)
Goal: Polished data entry and confirmation flows

Day 8 — Modal System
- Centered overlay with backdrop dimming
- Smooth open/close animations (scale + fade)
- Header with title and close button
- Body with scrollable content area
- Footer with action buttons

Day 9 — Form Enhancements
- Two-column grid layout for desktop forms
- Real-time validation with green/red border feedback
- Loading spinner on submit buttons during save
- Success toast notification with undo action
- Error states with inline field messages

## Phase 5: Notifications & Feedback (Day 10)
Goal: User feedback across the entire application

- Toast notification system (success, error, warning, info)
- Auto-dismiss timing (3s success, 5s error)
- Confirmation dialogs for destructive actions
- Empty state illustrations with action prompts
- Skeleton loading placeholders during data fetch

## Phase 6: Mobile Polish (Days 11-12)
Goal: Touch-optimized experience for field workers

Day 11 — Mobile Navigation
- Bottom tab bar replacing sidebar on phones
- Swipe gestures for table row actions
- Pull-to-refresh on data tables
- Larger touch targets (minimum 44px)

Day 12 — Mobile Forms & Tables
- Stacked form layouts on narrow screens
- Horizontally scrollable tables with frozen first column
- Collapsible filter sections
- Full-screen modal experience on mobile

## Phase 7: Dark Mode & Polish (Days 13-14)
Goal: Optional dark theme and final refinements

Day 13 — Dark Theme Toggle
- Sun/moon icon switcher in topbar
- Invert color tokens for dark mode
- Sidebar stays dark in both modes
- Card backgrounds: white (light) / #1e293b (dark)

Day 14 — Final Touches
- Keyboard navigation (Tab, Enter, Escape)
- Focus ring visibility for accessibility
- Print stylesheet optimization
- Performance audit (bundle size, load times)

## Implementation Priority

| Priority | Phase | Why First |
|----------|-------|-----------|
| P0 | Phase 1 | Everything depends on the design system |
| P1 | Phase 2 | Dashboard is the first screen users see |
| P1 | Phase 3 | Tables are used in 5 of 8 modules |
| P2 | Phase 4 | Forms appear in Encoding, Settings, Account Mgmt |
| P2 | Phase 5 | Feedback improves usability immediately |
| P3 | Phase 6 | Mobile usage expected for field workers |
| P3 | Phase 7 | Dark mode is nice-to-have, not critical |

## Estimated Total Effort: 14 working days
