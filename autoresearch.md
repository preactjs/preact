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

- Session initialized; baseline not yet recorded.
- Initial reading suggests likely opportunities in export structure and compat helper code, especially where React-compat wrappers duplicate references or introduce gzip-unfriendly patterns.
