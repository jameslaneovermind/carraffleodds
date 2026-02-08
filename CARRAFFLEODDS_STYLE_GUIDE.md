# CarRaffleOdds — Style Guide (v2)

This is the design system for AI tools (Cursor, etc.) building CarRaffleOdds. It defines the visual language, interaction patterns, and modern UX standards for the site. Follow the spirit of these guidelines — the AI should make smart layout decisions within this design system.

**Updated:** February 2026 — modernised from v1 with improved motion, dark mode, mobile UX, data visualisation, and interaction patterns.

---

## Build Order

This guide contains both core patterns and stretch goals. Build in this order:

1. **Core first:** Light theme only, standard responsive card grid, skeleton loaders, basic filters, sticky header. Get real data on the page.
2. **Polish:** Card entrance animations (first 9 only), progress bar animations, countdown timers, hero stat counters, toast notifications.
3. **Power features:** Command palette (Cmd+K), odds visualisation (trend arrows, percentile badges), bottom tab bar on mobile.
4. **Stretch goals:** Bento grid for featured section, dark mode pass across all components.

Do not skip ahead. A working light-mode site with real data and clean cards beats a half-built dark-mode bento grid every time.

---

## Brand Identity

**What we are:** An independent UK car raffle comparison tool. We help people find the best odds and value across competition sites.

**Tone:** Trustworthy, data-driven, modern. Not a gambling site — more like a smart comparison tool. Think Oddschecker meets CarWow, not Betfair.

**Audience:** UK car enthusiasts who enter raffles. They're savvy, they compare, they want to make informed decisions. Mostly male, 25-45, into modified cars and motorsport. They browse on phones, often late at night.

---

## Colour Palette

### Primary Colours

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary Dark | `#1e293b` | `slate-800` | Main headings, navigation, primary text |
| Primary Blue | `#3b82f6` | `blue-500` | Links, primary buttons, "Odds" text, data highlights |
| Deep Blue | `#1d4ed8` | `blue-700` | Active states, hover on primary buttons |

### Accent Colours

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Hero Gold | `#f59e0b` | `amber-500` | Hero headline emphasis ("Best Car Raffle Odds"), premium callouts |
| Dice Red | `#e11d48` | `rose-600` | Logo accent, alerts, "Hot Deal" badges, urgent indicators |
| Success Green | `#10b981` | `emerald-500` | "Excellent Value" indicators, good odds badges |
| Attention Orange | `#f97316` | `orange-500` | Timer badges, "Ending Soon" highlights, warnings |
| Premium Purple | `#8b5cf6` | `violet-500` | VIP/premium features, special promotions |

### Neutral Foundation

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Page Background | `#f8fafc` | `slate-50` | Main page background (light mode) |
| Card Background | `#ffffff` | `white` | Card surfaces, content areas (light mode) |
| Surface Gray | `#f1f5f9` | `slate-100` | Secondary backgrounds, filter bars, table headers |
| Border Gray | `#e2e8f0` | `slate-200` | Card borders, dividers |
| Text Gray | `#64748b` | `slate-500` | Secondary text, captions, metadata |
| Dark Gray | `#334155` | `slate-700` | Secondary headings, important secondary text |
| Body Text | `#1e293b` | `slate-800` | Primary body text |

### Semantic Design Tokens

Use semantic variable names rather than raw Tailwind colours so the system is meaningful:

```css
/* Odds quality */
--color-odds-excellent: theme('colors.emerald.500');  /* Best odds available */
--color-odds-good: theme('colors.blue.500');           /* Above average */
--color-odds-average: theme('colors.amber.500');       /* Mid-range */
--color-odds-poor: theme('colors.rose.500');            /* Below average */

/* Progress / urgency */
--color-progress-healthy: theme('colors.emerald.500'); /* < 50% sold */
--color-progress-warning: theme('colors.amber.500');   /* 50-80% sold */
--color-progress-critical: theme('colors.rose.500');   /* > 80% sold */

/* Status */
--color-new: theme('colors.blue.500');
--color-ending-soon: theme('colors.orange.500');
--color-ended: theme('colors.slate.400');
--color-best-value: theme('colors.emerald.500');
```

### Gradients

```css
/* Hero section / main CTAs */
background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);

/* Premium features / special sections */
background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);

/* Featured card border — subtle gradient border on hover */
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
/* Apply via a wrapper with p-[1px] and inner bg-white rounded */
```

### Dark Mode

> **Build order:** Install `next-themes` and set the `class` strategy in layout.tsx from day one, but **build light-only first**. Do NOT add `dark:` classes to components during the initial build. Once all core pages are working with real data, do a dedicated dark mode pass across all components. This avoids debugging contrast issues before the product even works.

Dark mode token mapping for the future dark mode pass:

| Token | Light | Dark |
|-------|-------|------|
| Page Background | `slate-50` | `slate-950` |
| Card Background | `white` | `slate-900` |
| Surface | `slate-100` | `slate-800` |
| Border | `slate-200` | `slate-800` |
| Primary Text | `slate-800` | `slate-100` |
| Secondary Text | `slate-500` | `slate-400` |
| Hero Gradient | `blue-500 → blue-700` | `blue-600 → blue-900` |

The tone should be sophisticated and clean — think Linear or Vercel, not "casino at night".

### Logo

The logo features two orange-to-red gradient dice alongside the wordmark "Car Raffle" in dark (or white on dark backgrounds) and "Odds" in blue. The dice use:

```css
/* Dice gradient */
background: linear-gradient(135deg, #fbbf24 0%, #ea580c 100%);
```

---

## Typography

**Font family:** Inter via `next/font/google` for optimal loading. Variable weight for crisp rendering.

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

```css
font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif;
```

**Scale:**
- Hero headline: 2.5rem–3rem, bold, white (on gradient) with gold accent for key phrase
- Page titles: 2rem–2.5rem, bold, slate-800
- Section headings: 1.5rem, semibold, slate-800
- Card titles: 1.125rem, semibold, slate-800
- Body text: 1rem, normal, slate-800
- Metadata / captions: 0.875rem, normal, slate-500
- Badges / labels: 0.75rem, medium, contextual colour

**Key data points** (ticket price, odds ratio, % sold) should be visually prominent — use tabular numbers (`font-variant-numeric: tabular-nums`) so columns align, and make them larger, bolder, or coloured.

---

## Component Patterns

### Cards (Raffle Cards)

The primary UI element. Each card represents one competition.

**Base card:**
```html
<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
            rounded-xl shadow-sm hover:shadow-md transition-all duration-200
            hover:-translate-y-0.5">
```

- Rounded corners (`rounded-xl` — slightly more modern than `rounded-lg`)
- Car image prominent at top (with lazy loading + blur placeholder)
- Clear data hierarchy: car name → site badge → price / odds / % sold → end date
- Featured cards get a **subtle gradient border** instead of a plain ring:

```html
<!-- Featured card wrapper -->
<div class="p-[1px] rounded-xl bg-gradient-to-br from-blue-400 to-violet-400">
  <div class="bg-white dark:bg-slate-900 rounded-xl p-0">
    <!-- card content -->
  </div>
</div>
```

**Card data layout (grid):**
```
| Ticket Price | Odds       | Value Ratio | Ends In        |
| £2.99        | 1 in 15k   | 4.2x        | 3d 14h (live)  |
```

**Card entrance animation:** Cards should fade in with a staggered delay using Framer Motion. **Only animate the first 6-9 visible cards** (above the fold). Cards beyond that should render immediately without animation — staggering 79+ cards will feel sluggish, not slick. Tune the threshold once you see it running with real data.

```tsx
const shouldAnimate = index < 9;

<motion.div
  initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
  animate={{ opacity: 1, y: 0 }}
  transition={shouldAnimate ? { duration: 0.3, delay: index * 0.05 } : { duration: 0 }}
>
```

### Featured Section (Homepage)

> **Build order:** Start with a **standard responsive grid** where the first "best odds" card is slightly larger (`col-span-2` on desktop, or a distinct "featured" variant with a bigger image and gradient border). Get this working cleanly across breakpoints first. The bento grid below is a **stretch goal** — only attempt it once the standard grid is solid with real data.

**Phase 1 — Standard grid with featured card:**
```
Desktop (3-col):
┌───────────────────┬───────────┬───────────┐
│  ★ Best Odds      │  #2       │  #3       │
│  (larger/featured)│           │           │
└───────────────────┴───────────┴───────────┘
┌───────────┬───────────┬───────────┐
│  #4       │  #5       │  #6       │
└───────────┴───────────┴───────────┘
```

**Stretch goal — Bento grid:**
```
Desktop (3-col):
┌─────────────────────┬───────────┐
│                     │  Ending   │
│   Best Odds (hero)  │  Soon #1  │
│                     ├───────────┤
│                     │  Ending   │
│                     │  Soon #2  │
└─────────────────────┴───────────┘
```

On mobile, both approaches collapse to a single column with the best odds card still visually prominent.

### Progress Bars (Tickets Sold)

- Show percentage of tickets sold as a horizontal bar with smooth animation
- Colour coding using semantic tokens:
  - < 50% sold: `emerald-500` (good odds remain)
  - 50-80% sold: `amber-500` (selling fast)
  - > 80% sold: `rose-500` (nearly gone)
- Show "X% sold" label
- Animate the bar width on mount:

```tsx
<motion.div
  className="h-2 rounded-full bg-emerald-500"
  initial={{ width: 0 }}
  animate={{ width: `${percentSold}%` }}
  transition={{ duration: 0.8, ease: "easeOut" }}
/>
```

### Odds Visualisation

Odds are the USP — make them visually outstanding, not just text.

**Visual odds bar:** A tiny proportional bar showing your chance vs the field:
```
Your chance: ████░░░░░░░░░░░░░░░░ 1 in 5,000
```

**Trend indicators:** Small arrow or sparkline showing if odds are improving or worsening:
- Arrow up (green): odds getting better (fewer tickets sold than expected)
- Arrow down (red): odds worsening (selling fast)
- Flat (gray): stable

**Comparative context badge:** "Better odds than 78% of raffles" — a percentile rank shown as a small badge on cards.

### Countdown Timers

Raffles ending within 7 days should show a **live countdown timer** that ticks in real-time:

```
Ends in: 2d 14h 32m 18s
```

- Use `useEffect` with `setInterval` (1s) for active countdowns
- Within 24 hours: switch to red/urgent styling with `text-rose-500`
- Within 1 hour: pulse animation on the timer

### Badges

Small pills/tags for status indicators:
- **Site badge:** Blue outline, site name/logo
- **Featured:** Gradient background (blue→violet), white text
- **Ending Soon:** Orange background, white text
- **Hot Deal / Best Value:** Green background, white text
- **New:** Blue-500 background, white text (for raffles scraped in last 24h)
- **Category:** Subtle gray background, dark text (performance, luxury, electric, etc.)
- **Odds Percentile:** Small emerald pill — "Top 10% odds"
- **Affiliate:** Small, subtle green indicator — not prominent

### Filters

- Horizontal filter bar at top of comparison pages
- Clean dropdowns and toggles, not overwhelming
- Active filters visually distinct (filled blue with count badge)
- Category filters as pill-shaped toggles
- Sort dropdown right-aligned
- **Instant filtering** — cards animate in/out smoothly when filters change (use `AnimatePresence` from Framer Motion)
- On mobile: filters collapse to a **bottom sheet/drawer**, not a dropdown

### Buttons

- **Primary CTA ("Enter Now", "View Competition"):** Blue gradient background, white text, rounded-lg, medium shadow, hover scale:

```html
<button class="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg
               px-6 py-3 shadow-md hover:shadow-lg hover:scale-[1.02]
               active:scale-[0.98] transition-all duration-150">
```

- **Secondary:** White/transparent background, blue border, blue text
- **Ghost:** No background, blue text, underline on hover
- **Dark mode toggle:** Sun/moon icon in the header, smooth icon transition

### Skeleton Loaders

Never show a bare spinner with "Loading..." text. Use skeleton screens that mimic the actual card layout:

```html
<!-- Skeleton card -->
<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
  <div class="h-48 bg-slate-200 dark:bg-slate-800" />        <!-- image -->
  <div class="p-4 space-y-3">
    <div class="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />  <!-- title -->
    <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />  <!-- subtitle -->
    <div class="flex gap-4">
      <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
      <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
      <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
    </div>
  </div>
</div>
```

Show 6-9 skeleton cards in the grid while data loads. They should appear instantly on page load.

### Empty States

When no data matches filters or on first load with no data:

- Use an **illustrated empty state** (simple SVG illustration or icon)
- Friendly, helpful copy: "No raffles match your filters. Try broadening your search."
- Clear CTA: "Clear filters" or "Browse all raffles"
- Never just show "No data found" with nothing else

### Command Palette (Cmd+K)

Implement a command palette using `cmdk` for power users:

- Trigger: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- Search raffles by car name, site, price range
- Quick navigation: "ending soon", "best odds", "BMW raffles"
- Inline filtering: "BMW under £5"
- Show recent searches and popular queries
- Style it as a centered modal with blur backdrop

```
┌──────────────────────────────────┐
│ 🔍 Search raffles, sites, cars...│
├──────────────────────────────────┤
│ Recent                           │
│   BMW M3 Competition             │
│   Ending soon                    │
│ ─────────────────────────────    │
│ Quick links                      │
│   → Best Odds    → Ending Soon   │
│   → All Raffles  → Sites         │
└──────────────────────────────────┘
```

### Toast Notifications

Use `sonner` (or shadcn's toast) for non-blocking notifications:
- "3 new raffles added" — when fresh data is available
- "Filters applied — showing 24 results"
- "Copied link to clipboard"
- Position: bottom-right on desktop, bottom-center on mobile
- Auto-dismiss after 4 seconds

---

## Layout Principles

1. **Clean and spacious.** Generous padding and whitespace. Don't cram data in.
2. **Cards in a responsive grid.** 3 columns on desktop, 2 on tablet, 1 on mobile.
3. **Bento hero section** on homepage — asymmetric grid featuring best odds, ending soon, and new raffles.
4. **Data-first.** The numbers (odds, price, % sold) should be the first things your eye hits on any card.
5. **Mobile-first.** Most users are on phones. Cards stack cleanly, filters use a bottom sheet/drawer.
6. **Sticky header** with logo, dark mode toggle, and Cmd+K search trigger. Main nav visible on desktop, hamburger on mobile.
7. **Bottom tab bar on mobile** instead of relying solely on the hamburger menu. Tabs: Home, Raffles, Ending Soon, Sites, More.

### Navigation Structure

**Desktop (sticky header):**
```
┌──────────────────────────────────────────────────────┐
│ 🎲🎲 Car Raffle Odds  │ Home  Raffles  Ending Soon  Sites  │  🔍  🌙  │
└──────────────────────────────────────────────────────┘
```
- Search icon triggers command palette (Cmd+K)
- Moon/sun icon toggles dark mode

**Mobile (sticky header + bottom tabs):**
```
Header:
┌────────────────────────────┐
│ 🎲🎲 Car Raffle Odds    ☰  │
└────────────────────────────┘

Bottom tab bar (fixed):
┌────────────────────────────┐
│  🏠    📋    ⏰    🏢    ···  │
│ Home  Raffles Ending Sites More│
└────────────────────────────┘
```
- Bottom tabs are always visible on mobile — key pages are one tap away
- The "More" tab opens a menu with secondary items (About, FAQ, etc.)

### Hero Section

The homepage hero should include:
- Blue gradient background
- Bold headline with gold accent: "Find the **Best Car Raffle Odds** in the UK"
- Subtitle: "Compare live odds, find the best deals, and win your dream car"
- Single search bar or "Browse All Raffles" CTA (not both + header search)
- **Dynamic stats** with animated number counters:
  - Live Competitions count
  - Sites Tracked count
  - Total Prize Value (formatted)
  - Best odds currently available (e.g. "1 in 2,400")
- Stats should use glassmorphism cards: `bg-white/10 backdrop-blur-md border border-white/20 rounded-xl`
- **"Last updated X minutes ago"** timestamp for credibility
- Trust indicators below: "Verified & trusted", "Updated every hour", "Trusted by thousands"

**Animated stat counters:**
```tsx
// Count up from 0 to target number on mount
<motion.span
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
  {useCountUp(targetValue, { duration: 1.5 })}
</motion.span>
```

### Smart Search Behaviour

- **Header search** appears as a compact icon/trigger on scroll (opens command palette)
- **Hero search** is the prominent entry point on the homepage
- These are the same underlying command palette — not two different search UIs
- On scroll past the hero, the header search icon becomes visible (use Intersection Observer)

---

## Visual Hierarchy on Cards

In order of visual prominence:
1. **Car image** — the emotional hook (lazy loaded with blur-up placeholder)
2. **Car name / title** — what am I winning?
3. **Ticket price** — what does it cost? (bold, prominent)
4. **Odds ratio + visual bar** — what are my chances? (with trend arrow)
5. **% sold progress bar** — how much time/stock is left? (colour-coded, animated)
6. **Countdown timer** — when does it close? (live ticking if < 7 days)
7. **Site name** — who's running it? (small badge)
8. **Odds percentile** — "Better than 78% of raffles" (small context badge)
9. **CTA button** — take me there

---

## Motion & Animation

The site should feel **alive and responsive** without being distracting. Use Framer Motion as the animation library.

### Allowed Animations
- **Card entrance:** Fade up with stagger (0.05s delay per card, 0.3s duration)
- **Filter transitions:** Cards animate in/out with `AnimatePresence` (layout animation)
- **Hover effects:** Cards lift slightly (`-translate-y-0.5`) with shadow increase
- **Button press:** Subtle scale down on active (`scale-[0.98]`)
- **Number counters:** Count up on mount for hero stats
- **Progress bar fill:** Smooth width animation on mount
- **Skeleton pulse:** Standard `animate-pulse` for loading states
- **Page transitions:** Subtle fade between routes
- **Countdown timers:** Ticking numbers update every second
- **Dark mode toggle:** Smooth colour transition (`transition-colors duration-200`)

### Forbidden Animations
- No bouncing or spring-loaded elements
- No pulsing/glowing borders
- No particle effects
- No parallax scrolling
- No auto-playing carousels
- No confetti or celebration animations
- Nothing that loops infinitely (except countdowns)

---

## Real-Time Feel

The site should feel like live data, not a static page:

- **Countdown timers** on all raffles ending within 7 days (ticking every second)
- **"New" badges** on raffles scraped in the last 24 hours
- **"Last updated X mins ago"** in the hero and footer
- **"X tickets sold in last hour"** indicators where data is available
- **Optimistic UI** — when filters change, show results immediately, don't wait for re-fetch
- **Background refresh** — silently check for new data periodically without disrupting the user

---

## What to Avoid

- **Casino/gambling aesthetics.** No neon, no flashing, no slot-machine energy. We're a comparison tool, not a betting site.
- **Overly corporate.** It should feel approachable and modern, not like a bank.
- **Cluttered cards.** Show the essential data. Details can live in an expanded view or detail page.
- **Generic stock imagery.** Use the actual car images from the raffle sites.
- **Excessive animation.** Purposeful motion only — every animation should serve UX, not decoration.
- **Bare loading states.** Never show a spinner with "Loading..." — always use skeleton screens.
- **Duplicate UI.** Don't show two search bars or duplicate navigation. Each element should have one clear purpose.
- **Hamburger-only mobile nav.** The bottom tab bar is the primary mobile navigation.

---

## Inspiration References

- **Linear** — dark mode done right, clean motion, command palette
- **Vercel Dashboard** — sophisticated dark/light themes, excellent data presentation
- **Oddschecker** — data-dense comparison with clean layout
- **CarWow** — car-focused, trustworthy, good card layouts
- **Revolut/Monzo** — bottom tab bar mobile navigation pattern
- **CompareTheMarket** — friendly comparison tool energy
- **The existing carraffleodds.com** — the blue gradient hero, card grid, and filter approach as starting points

---

## Tech Stack Quick Reference

| Concern | Tool |
|---------|------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Animation | Framer Motion |
| Dark mode | next-themes (class strategy) |
| Command palette | cmdk |
| Toasts | sonner |
| Icons | Lucide React |
| Font | Inter (next/font/google) |
| Charts/sparklines | Recharts (lightweight) |

---

## Quick Reference for Cursor

When building components, default to:

**Cards:**
```
bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5
transition-all duration-200
```

**Text:**
```
text-slate-800 dark:text-slate-100  (primary)
text-slate-500 dark:text-slate-400  (secondary)
```

**Accents:**
```
text-blue-500       links, data highlights
text-emerald-500    good odds, value indicators
text-amber-500      warnings, ending soon
text-rose-500       urgent, nearly sold out
text-orange-500     ending soon badges
```

**Spacing:**
```
p-5 or p-6 on cards
gap-4 or gap-6 in grids
py-12 or py-16 between major sections
```

**Glassmorphism (hero stats):**
```
bg-white/10 backdrop-blur-md border border-white/20 rounded-xl
```

**Base dependencies:**
- Use shadcn/ui components as the foundation — they support dark mode out of the box
- Framer Motion for all entrance/exit animations
- cmdk for the command palette
- sonner for toast notifications
- next-themes for dark mode toggling
- Lucide React for all icons
