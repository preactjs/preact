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

The first two commits on each branch are the lean version: #5399, a
suspending component claims only its own range, and RTS marks the components
a streamed boundary renders. On top of that, the branches now carry every fix
we found, so streaming and `renderToStringAsync` hydrate correctly in every
shape the harness has.

Preact:

1. `insert()` moves the server DOM a suspended component kept when its keyed
   list reorders. This path runs for all hydration. (keyed, keyedNoStream)
2. A component only claims a numbered marker (`<!--$s3-->`) whose number is
   its own depth: the components between it and the closest element, not
   counting Fragments. Only `$s?` and `$s!` ranges count as fallback ranges.
   (innerPlain, wrapFirstServer)
3. Each Suspense gets its own useId counter, so ids inside a boundary don't
   depend on when it resolves. Ids inside a Suspense look like `PP0-1-0`.
   (useId)
4. A boundary leaves its own `$s:id` range, and a range a boundary above it
   took over, to its children. A suspender claims a fallback range only when
   it comes first and the client hasn't rendered into it yet. Otherwise it
   keeps the first fallback node and diffs its attributes when it resumes,
   and the leftover markers and PIs are removed so the chunk can't patch over
   client DOM. (outerNoRange, outerNoRangeLazy, lazySecond, lazyRef,
   serverWaterfall, nest3)
5. A boundary skips numbered markers that belong to components above it.

RTS:

1. Every component range gets its depth number.
2. Each component a Suspense renders directly gets markers, in every render
   mode. (multiRootClient, gateAboveNoWrap, wrapFirstClient)
3. The streamed-chunk and `renderToStringAsync` retries restart the
   boundary's useId counter.
4. Every component in a streamed chunk, and every component
   `renderToStringAsync` renders again after it suspended, gets markers.
   (lazyMulti)

Risky changes to look at in review:

- A `$s:id` range can be claimed when it's the first node of a range a
  boundary took over. The lean version never claimed one.
- When a suspender doesn't claim the whole taken-over range, that range can no
  longer receive its chunk.
- `_excess` is now also an expando on DOM nodes, and set to `2` on the list
  when the client renders into a taken-over fallback range.
- The keyed `insert()` change affects all hydration.
- useId values inside a Suspense change format.
- More markers in the HTML (see below).

## Harness

The local harness is at `/tmp/prs/harness/local`. It rebuilds
https://preact-hydration-harness.to-email-max.workers.dev/, whose source isn't
public. It runs 53 shapes, each under 40 interleavings of chunk arrival and
lazy resolution.

    node run.mjs --preact <worktree> --rts <dir> --label X [--schedules 40] [--shapes a,b] [--rebuild]
    node x/run-async.mjs ...          # same shapes through renderToStringAsync
    node x/classify.mjs --label X     # broken UI vs wasted work, per phase

Results land in `out/<label>/results.json`.

| preact / rts       | shapes passing | failing runs |
| ------------------ | -------------- | ------------ |
| main / main        | 36             | 329          |
| #5399 / main       | 36             | 311          |
| combined prototype | 35             | 295          |
| v5 / main          | 45             | 200          |
| v5 / RTS-min       | 48             | 132          |
| v5 / RTS-all       | 49             | 98           |
| lean / main        | 38             | 322          |
| lean / lean RTS    | 40             | 263          |

v5 passes more shapes but costs a lot more in preact. We left it out because
it's unclear how much streaming will be used.

The harness copy at `/tmp/prs/harness/fb` adds 4 shapes (wrapFirstClient,
wrapMidClient, wrapFirstServer, twoChildrenFirstClient), 57 in total.

| harness             | lean branches           | these branches, seed 57 | these branches, seed 99 |
| ------------------- | ----------------------- | ----------------------- | ----------------------- |
| streaming           | 43/57, 283 failing runs | 57/57, 0                | 56/57, 1 (twoInOne)     |
| renderToStringAsync | 46/57, 230 failing runs | 54/57 (serverError\*)   | 54/57 (serverError\*)   |

The one twoInOne run is a rare race that the lean branches fail in the same
way (1 of 381 runs with 400 schedules, seed 99). The page hydrates while the
boundary's range is still pending, both chunks arrive, then both lazy children
resolve before the next render. The second child kept no DOM, and when it
resumes it lands after the boundary's next sibling (`1, z, 2`). Not
fixed yet.

useId variants (`/tmp/prs/harness/idcheck`, "DOM id equals the client's
`useId()`"): 9 of 11 pass in each mode. The two left are the counter's limit:
a client that suspends while hydrating while a later sibling takes the id
first, or a retry caught below the boundary. Only tree-position ids fix those.

HTML grows with the extra markers, about 19 B per marked component: +10.7%
over the harness shapes when streaming, +21.4% through `renderToStringAsync`
(inflated, since almost every harness shape suspends).

## renderToStringAsync

Through `renderToStringAsync`, main, the revert branches and these branches
fail the same runs (209). So there's no regression, and the revert fixes
nothing either. The same shapes fail on 11.2.0 with RTS 6.8.3. These failures
exist without streaming, so streaming inherits them.

We prototyped a fix for each one on top of the revert branches. Patches are in
`/tmp/prs/fixes/async/`, one per fix, plus `combined/` with 1 to 3 applied
together.

| failure                          | fix                                                           | where                | preact bytes (min+gzip)      |
| -------------------------------- | ------------------------------------------------------------- | -------------------- | ---------------------------- |
| keyed, keyedNoStream             | 1. `insert()` moves the DOM a suspended component kept        | core                 | +33                          |
| innerPlain, wrapFirstServer      | 2. numbered markers, so a component knows its own marker      | core + RTS           | +48                          |
| multiRootClient, gateAboveNoWrap | 3. markers around each component a Suspense renders directly  | RTS                  | 0                            |
| useId                            | 4. each Suspense gets its own useId counter                   | compat + hooks + RTS | core 0, compat +14, hooks +3 |
| serverError\*                    | 5. opt-in `onError` renders the fallback instead of rejecting | RTS                  | 0                            |
| lazyMulti                        | none that's cheap                                             |                      |                              |

1 to 3 together take the async harness from 46 to 52 of 57 shapes passing (the
53 plus 4 extra shapes in `/tmp/prs/harness/fxm`), with no regressions. Core
goes from 4961 to 5041 B (+80 B). Preact tests pass (1472). RTS fails only 14
tests whose expected markup now has numbered markers (`<!--$s2-->`).

1. **Keyed reorder.** A component that suspends while hydrating keeps its
   server DOM, but its vnode has no children. When a keyed list reorders,
   `insert()` walks the empty child list and moves nothing, so the kept DOM
   stays put (got `c,a,b`, want `c,b,a`). The fix places such a component like
   a DOM node and moves its whole `$s` range. This path runs for all
   hydration, not just streaming. Fixes keyed 14/37 and keyedNoStream 21/39.
2. **Marker ownership.** The cursor isn't moved until a DOM node is used. So
   the component that owns `<!--$s-->` and a descendant that suspends on the
   client both start on the same marker, and the descendant claims the whole
   range. No HTML layout alone can separate them. RTS writes the owner's depth
   (components between it and the closest element, not counting Fragments)
   into the marker: `<!--$s3-->`. The client only claims a numbered marker
   whose number matches its own depth. Unnumbered markers are claimed as
   before, so an old RTS keeps working. A 37 B variant drops that, at the cost
   of breaking with an old RTS. An empty sibling at the same depth right
   before the owner can still take its range; that's broken today too.
3. **Direct-child markers.** A component that suspends while hydrating keeps
   only its first server node, because nothing tells the client where its
   output ends. The leftover nodes get adopted by the wrong siblings. Wrapping
   each component a Suspense renders directly fixes that (about 19 B of HTML
   each). On its own it breaks wrapFirstClient (0/21 to 21/21): a wrapper's
   first child that suspends on the client takes the wrapper's marker. Fix 2
   solves that, so 3 needs 2. This is the same idea the RTS feature branch
   uses for streamed chunks.
4. **useId.** Preact's useId is one counter per root, in render order. The
   server renders a suspended subtree last, so the sibling after it takes the
   lower id. The harness's useId shape doesn't actually show this: in every
   schedule it generates the client also suspends while hydrating, so its ids
   match the server DOM, and the 21/21 failures compare against a tree-order
   render no real client produces. The bug is real when the client doesn't
   suspend, or when the server hands out an id on an attempt it throws away. A
   copy of the harness at `/tmp/prs/harness/idcheck` checks "DOM id equals the
   client's `useId()`" over 11 variants: 8 fail before the fix, 2 after. The
   fix: each compat Suspense takes one id from its parent, in tree order on
   both sides, and numbers its subtree from it (`PP0-1-0`). RTS restarts that
   counter when it retries a boundary. A server-only fix can't work, because
   the client numbers in render order. The 2 left need React-style
   tree-position ids.
5. **serverError.** `renderToStringAsync` rejects on any error that isn't
   marked recoverable, so there's no HTML to hydrate. The streaming renderer
   reports the error and emits a `$s!` fallback instead. The prototype adds
   `renderToStringAsync(vnode, context, { onError })`: with it, the nearest
   Suspense reports the error and renders its fallback as `<!--$s!-->`. It
   swallows errors if `onError` ignores them, and a Suspense inside a class
   error boundary doesn't get it. Making it the default is a product call.
6. **lazyMulti.** The suspender sits deep inside the boundary, and the server
   can't know which component will suspend on the client. Options are
   whole-boundary suspension in core (#5394's approach, bytes not measured,
   siblings stay inert until it resolves), or documenting that a component
   that may suspend while hydrating renders a single root or sits directly
   under a Suspense.

PRs against `main`:

- preactjs/preact-render-to-string#505 (fix 4, server half): merged.
- preactjs/preact#5402 (fix 4, client half): draft.
- JoviDeCroock/preact-suspense#9 (fix 4 for preact-suspense): draft.
- preactjs/preact-render-to-string#506 (fix 3): draft. Shouldn't merge before
  fix 2.

Fixes 1, 2 and 5 aren't PRs on their own; 1 to 4 are all on these branches.

## Size (preact, gzip)

| build                       | bytes |
| --------------------------- | ----- |
| main (with #5360)           | 5027  |
| #5399                       | 5034  |
| v5                          | 5086  |
| lean feature branch         | 5008  |
| revert branch               | 4961  |
| revert + async fixes 1 to 3 | 5041  |
| feature branch, all fixes   | 5173  |

## How we're weighing it

If streaming gets better, that's a win. If `renderToStringAsync` doesn't
regress, that's a win too. The lean version cost 47 B over the revert. With
every fix, the branches cost 212 B over the revert (146 B over main before the
revert), plus 3 B in hooks and 14 B in compat. About 80 B of that also fixes
`renderToStringAsync`, which has these bugs without streaming.

## Open questions

- Do we ship DPU streaming at all, or keep it on this branch for now?
- Which fixes to take to main for `renderToStringAsync` alone: keyed,
  ownership and direct-child markers cost about 80 B in core together.
- Whether the extra HTML from marking every component in a chunk or async
  retry is worth it, or whether lazyMulti gets a documented single-root rule
  instead.
- serverError: whether `renderToStringAsync` should render the fallback on
  errors (opt-in `onError`, prototyped in `/tmp/prs/fixes/async/`).
- useId: tree-position ids would fix the last two variants.

---

Written with the help of Opus 5.5 and Fable 5.2.
