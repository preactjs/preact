# Autoresearch: bundle size for compat, hooks, and core

## Objective

Reduce the shipped gzipped bundle size of the core (`src` → `dist`), `hooks`, and `compat` packages without introducing breaking changes. Optimizations must reflect real production bundle output and must not game the benchmark.

## Metrics

- **Primary**: `total_gzip_bytes` (bytes, lower is better)
- **Secondary**: `core_gzip_bytes`, `hooks_gzip_bytes`, `compat_gzip_bytes`

## How to Run

`./autoresearch.sh` — builds core, hooks, and compat, then prints `METRIC` lines.

## Files in Scope

- `src/**` — core implementation and exports
- `hooks/src/**` — hooks package implementation
- `compat/src/**` — compat implementation and React-compat helpers
- `autoresearch.sh` — benchmark harness for bundle size
- `autoresearch.checks.sh` — correctness checks required by the user
- `autoresearch.ideas.md` — deferred optimization ideas

## Off Limits

- Public API / semantics
- Test files unless needed for non-breaking validation updates
- Benchmark cheating (e.g. changing build output shape or omitting shipped artifacts)
- New runtime dependencies

## Constraints

- No breaking changes
- Optimize for gzipped size
- Keep the benchmark representative of shipped artifacts
- Tests must pass
- Do not overfit to the benchmark

## Benchmark Definition

The benchmark runs:

- `pnpm build:core`
- `pnpm build:hooks`
- `pnpm build:compat`

It then gzips and sums the emitted shipped JS artifacts for those packages:

- core: `dist/preact.js`, `dist/preact.module.js`, `dist/preact.umd.js`
- hooks: `hooks/dist/hooks.js`, `hooks/dist/hooks.module.js`, `hooks/dist/hooks.umd.js`
- compat: `compat/dist/compat.js`, `compat/dist/compat.module.js`, `compat/dist/compat.umd.js`

The primary metric is the total gzip byte count across those 9 files.

## What's Been Tried

- Baseline recorded at `total_gzip_bytes=31440` (`core=14220`, `hooks=4675`, `compat=12545`).
- Failed: factoring compat `render`/`hydrate` through a shared helper increased compat gzip by 36 bytes.
- Failed: building compat's default export from a hooks namespace plus `assign()` increased compat gzip by 164 bytes.
- Win: simplified hooks `useReducer` bailout/update logic to iterate the hook list directly and always return `hookState._value`; reduced hooks gzip by 68 bytes.
- Win: backported a compat Suspense simplification from `main` by dropping a hydration-only unmount mutation and inlining fallback creation; reduced compat gzip by another 70 bytes with tests still passing.
- Win: replaced `process._rerenderCount` property access in `src/component.js` with a local `rerenderCount` variable; reduced core gzip by 13 bytes.
- Win: simplified ref cleanup logic in `src/diff/index.js` by inlining the unmount checks and flattening the ref-unmount condition in `unmount()`; reduced core gzip by another 7 bytes.
- Win: stopped coercing `INSERT_VNODE` placement state to a boolean in `src/diff/children.js`; reduced core gzip by another 9 bytes.
- Win: backported the compat `render.js` change to only call `toLowerCase()` on event props when needed and to fold the `oninput` normalization into that branch; reduced compat gzip by another 74 bytes.
- Failed: loosening core defaultProps undefined checks was not safe; it broke createElement null-props semantics.
- Win: switched `src/util.js` to export `assign = Object.assign`; reduced core gzip by another 24 bytes with tests passing.
- Win: switched `compat/src/util.js` to export `assign = Object.assign`; reduced compat gzip by another 5 bytes.
- Current insight: explicit compat export wiring compresses better than abstract helper/namespace approaches, and the best remaining wins are likely targeted compat/core hot-path cleanups plus small builtin substitutions rather than broad refactors.
