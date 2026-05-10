---
inclusion: auto
---

# React Best Practices (Vercel Engineering)

> Source: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
> Content was rephrased and condensed for compliance with licensing restrictions.

This steering file provides React and Next.js performance optimization guidance across 8 categories, prioritized by impact. Follow these rules when writing React components, API routes, and data fetching logic.

## Key Rules by Priority

### CRITICAL — Eliminating Waterfalls
- Use `Promise.all()` for independent async operations instead of sequential awaits
- Check cheap synchronous conditions before expensive async calls
- Move `await` into the branch where data is actually used (defer await until needed)
- In API routes, start independent operations immediately even if not awaited yet
- Use Suspense boundaries to show wrapper UI while data loads

### CRITICAL — Bundle Size
- Import directly from source files, not barrel files (or use Next.js `optimizePackageImports`)
- Use `next/dynamic` for heavy components not needed on initial render
- Defer non-critical third-party libraries (analytics, logging) to load after hydration
- Prefer statically analyzable import paths over dynamic string composition

### HIGH — Server-Side Performance
- Authenticate Server Actions like API routes — they are public endpoints
- Minimize data passed across RSC boundaries — only send fields the client uses
- Use `React.cache()` for per-request deduplication of DB queries and auth checks
- Hoist static I/O (fonts, config files) to module level — runs once, not per request
- Use `after()` for non-blocking operations (analytics, logging) after response is sent
- Avoid shared mutable module state for request-scoped data

### MEDIUM-HIGH — Client-Side Data Fetching
- Use passive event listeners for scroll/touch handlers
- Version and minimize localStorage data; always wrap in try-catch

### MEDIUM — Re-render Optimization
- Calculate derived state during rendering instead of storing in state + effect
- Don't define components inside components (causes remount every render)
- Use functional `setState` updates to prevent stale closures
- Use lazy state initialization for expensive initial values
- Split combined hook computations with different dependencies
- Extract default non-primitive parameter values from memoized components to constants
- Use `useRef` for transient values that don't need re-renders
- Use `useTransition` for non-urgent updates

### MEDIUM — Rendering Performance
- Use CSS `content-visibility: auto` for long lists
- Animate SVG wrappers instead of SVG elements directly
- Use explicit conditional rendering (`? :`) instead of `&&` to avoid rendering `0`
- Use React DOM resource hints (`preconnect`, `preload`, `prefetchDNS`)
- Use `defer` or `async` on script tags (or `next/script` with `strategy`)

### LOW-MEDIUM — JavaScript Performance
- Build index Maps for repeated lookups instead of `.find()` in loops
- Use `Set` for O(1) membership checks instead of `.includes()`
- Use `.flatMap()` instead of `.map().filter(Boolean)`
- Use `.toSorted()` instead of `.sort()` to avoid mutating arrays
- Use `requestIdleCallback` for non-critical background work
- Early return from functions when result is determined
- Hoist RegExp creation outside render

### LOW — Advanced Patterns
- Don't put Effect Events in dependency arrays
- Initialize app-wide setup once (module-level guard), not in `useEffect([])`
- Use `useEffectEvent` for stable callback refs in effects
