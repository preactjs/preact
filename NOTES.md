# DPU streaming: notes

These notes collect what we found while reviewing streamed hydration with
Declarative Partial Updates (DPU). The same file lives on the
`feature/dpu-streaming` branch of both `preact` and
`preact-render-to-string`. The two branches only work together. The server
marks ranges and the client relies on those marks.

## Where this started

- preactjs/preact#5394 and preactjs/preact-render-to-string#502 (built on
  #501) by MaxwellCohen. They try to fix hydration of lazy components inside
  streamed boundaries.
- preactjs/preact#5388 was closed. It handled too few edge cases.
- preactjs/preact#5399 is open and fixes bug 2 below (+7 B).

## What was on main, and what the revert PRs take out

Preact:

- #5360 (`pending-range-hydration`), unreleased. It lets a boundary take
  over a pending `$s?:id` range while hydrating. Test commit 63e1c819 only
  touched #5360's own tests, so it goes with it.
- #5315 stays. It serves the old `<preact-island>` format, which also used
  `$s:id`/`/$s:id` ranges, and it shipped in 11.0.2.

preact-render-to-string:

- #490 (DPU streaming format, includes #494), #496 and #497. All landed after
  v6.8.3, so none of them are released.
- #498 (doctype) and #499 (node flush) stay. They're generic streaming fixes
  that apply to the island format too. #499's test asserted DPU markup, so
  the revert updates it to `>first</preact-island>`.

## Markup

- Pending: `<!--$s?:id--><?start name="id">fallback<?end><!--/$s:id-->`
- Failed: `$s!:id`
- Patched: `$s:id`. The `$PRS` init script renames the range once
  `<template for="id">` arrives.
- `renderToStringAsync` marks each component that suspended with
  `<!--$s-->…<!--/$s-->`, and client-only content with `<!--$s!-->`.

Chromium parses `<?start>` as a processing instruction (nodeType 7), not as a
comment. Anything that walks comments has to account for that.

## Bugs in #5394 / main

1. **Lazy first in a patched range claims the boundary's range.** Once the
   chunk is patched in, the range reads `$s:id`, and a lazy component that's
   the first child of the boundary claims all of it. The sibling after it then
   adopts the wrong node: in the repro, Buy adopts `#help`. Plausible but
   narrow. `renderToStringAsync` doesn't have this because it marks
   components (`$s`), not boundaries (`$s:id`).
2. **Lazy after a title in a pending range steals the footer.** The claim
   runs past the end of the range and takes the next sibling outside the
   boundary. Introduced by #5360, so it's unreleased until main ships. Fixed
   by #5399.
3. a. A lazy component that renders `null` before an inner patched boundary.
   Rare.
   b. A lazy component with several roots and no markers around them. A
   general limitation that `renderToStringAsync` shares.
4. `refQueue` ordering. Harmless.
5. Id collisions with #501's id scheme. Unlikely in practice.

Reproductions for 1 and 2 were run as browser tests against
`compat/test/browser/suspense-hydration.test.jsx`.

Bytes for the bug 1 variants we tried (gzip, over #5399): V0 +12, V1 +27,
V2g +41, V3g +52. None of them was worth it alone.

## Root causes (worked out with Fable)

1. `<?start>`/`<?end>` are processing instructions, not comments.
2. When there's no excess DOM, the fallback path leaves a hole.
3. A component claims the range of a boundary, not its own.
4. A nested boundary owns markers the outer component expected to claim.
5. The hydration cursor rests on an unclaimed `/$s:id`.

An earlier combined prototype that stopped claiming `$s:id` ranges (the
"colon rule") exposed cause 5. That's where its regressions came from: keyed
23→29, keyedComp 0→5, hideOnly 0→5.

## What the feature branches do

- Preact: #5399, plus "Claim only a component's own streamed range while
  hydrating". A suspending component keeps its own range (all of it when
  unclosed), or else the first node that isn't a comment. It never claims a
  boundary's `$s:id` range. The step-back loop and the no-excess fallback
  are gone.
- RTS: inside a streamed chunk, each component the boundary renders directly
  gets `<!--$s-->…<!--/$s-->`, the same marker `renderToStringAsync` uses. A
  boundary that didn't suspend but starts with a streamed one gets its own
  `$s:id` range ("RTS-min"). Shell markup and `renderToStringAsync` output
  don't change.

The preact change needs the RTS markers. Lean preact with RTS main regresses
4 shapes (multiRoot, html, tickProp, nest3). With the RTS change it regresses
none.

## Harness

The local harness is at `/tmp/prs/harness/local`. It rebuilds
https://preact-hydration-harness.to-email-max.workers.dev/, whose source isn't
public. It runs 53 shapes, each under 40 interleavings of chunk arrival and
lazy resolution.

    node run.mjs --preact <worktree> --rts <dir> --label X [--schedules 40] [--shapes a,b] [--rebuild]
    node x/run-async.mjs ...          # same shapes through renderToStringAsync
    node x/classify.mjs --label X     # broken UI vs wasted work, per phase

Results land in `out/<label>/results.json`.

| preact / rts                | shapes passing | failing runs |
| --------------------------- | -------------- | ------------ |
| main / main                 | 36             | 329          |
| #5399 / main                | 36             | 311          |
| combined prototype          | 35             | 295          |
| v5 / main                   | 45             | 200          |
| v5 / RTS-min                | 48             | 132          |
| v5 / RTS-all                | 49             | 98           |
| lean / main                 | 38             | 322          |
| lean / lean RTS (these PRs) | 40             | 263          |

v5 passes more shapes but costs a lot more in preact. We left it out because
it's unclear how much streaming will be used.

Shapes still failing on these branches: nest3 (2/40), gateAboveNoWrap,
keyed, lazySecond, multiRootClient, keyedNoStream, serverWaterfall,
outerNoRange, outerNoRangeLazy, innerPlain, lazyMulti, lazyRef, useId.

## renderToStringAsync

Through `renderToStringAsync`, main and these branches fail the same runs
(209). So there's no regression. Seven shapes fail for real: gateAboveNoWrap,
keyed, keyedNoStream, multiRootClient, innerPlain, lazyMulti and useId. The
three `serverError*` shapes only fail because of how the harness records
them. These failures exist without streaming, so streaming inherits them.

## Size (preact, gzip)

| build             | bytes |
| ----------------- | ----- |
| main (with #5360) | 5027  |
| #5399             | 5034  |
| v5                | 5086  |
| feature branch    | 5008  |
| revert branch     | 4961  |

## How we're weighing it

If streaming gets better, that's a win. If `renderToStringAsync` doesn't
regress, that's a win too. The branches aim for both without growing preact
much: they cost 47 B over the revert and are smaller than main today.

## Open questions

- Do we ship DPU streaming at all, or keep it on this branch for now?
- Marking every component in a chunk (RTS-all) helps more, but only after a
  client fix for the cursor issue (cause 5).
- The keyed insert bug while hydrating (keyed, keyedNoStream).
- `useId` order differs between server and client inside boundaries.
- lazyMulti: several lazy siblings in one boundary.

---

Written with the help of Opus 5.5 and Fable 5.2.
