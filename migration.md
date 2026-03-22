# Preact Next Migration Plan

This document describes how to move Preact toward a real 2-phase rendering model without repeating the previous v11 effort where too many architectural changes landed at once.

The immediate goal is correctness:

- `componentDidUpdate` must run only after sibling DOM is fully updated
- animation libraries must observe the final DOM tree, not an intermediate state
- the path to comment-range ownership must stay open
- the path to compiled templates must stay open

The plan below treats those as separate concerns instead of one rewrite.

## Current Checkpoint

The branch has now landed the first real runtime slice of this migration.

What is in place:

- structural DOM work is deferred into a real commit phase
- refs and lifecycle callbacks run after host structural work
- unkeyed children are now positional-only
- keyed children still support movement and reuse
- host-subtree bailout exists for stable host trees, but is now shaped around vnode flags instead of generic recursive child normalization

What is intentionally not in place yet:

- comment-range ownership as a formal host primitive
- Suspense rewrite
- compiler blocks
- a new persistent backing-node object model

### Current Runtime Shape

The current implementation is still vnode-based, but the commit boundary is real for structural work:

- child diff plans structure during reconcile
- host structural work is flushed in `commitRoot()`
- refs and lifecycle callbacks observe final sibling DOM

This is enough to address the target bug class where `componentDidUpdate` must not see partially updated sibling DOM.

### Semantic Decisions Already Taken

The migration now assumes:

- keyed children own identity and may reorder
- unkeyed children are slot-by-slot only
- unkeyed insertions/removals remount shifted children instead of preserving incidental state
- exact DOM op order is not a contract as long as DOM is correct and work stays bounded

That semantic tightening simplified the diff and made the current runtime much easier to reason about.

### Benchmark Checkpoint

Using the local Krause benchmark checkout at `/Users/marvinhagemeister/dev/github/js-framework-benchmark`, the current focused results for `frameworks/keyed/preact-classes` are:

- `02_replace1k`: `28.5` total / `9.7` script median
- `05_swap1k`: `26.2` total / `4.4` script median
- `06_remove-one-1k`: `53.9` total / `17.9` script median

These are not final acceptance numbers, but they establish the current shape:

- `replace1k` recovered strongly after introducing the host-subtree bailout
- `swap1k` is in a much healthier range than the early structural-commit prototypes
- `remove-one-1k` remains the main unresolved outlier

### What We Learned From Profiling

For the remaining `remove-one-1k` cost:

- the bottleneck is not extra DOM ops
- the bottleneck is not keyed search or placement volume
- the hottest code path is host-subtree bailout work on surviving rows after removal

That led to one important design adjustment:

- bailout logic should avoid allocations and generic shape inference
- bailout logic should rely on existing vnode flags and direct property checks wherever possible

Several experiments were attempted and reverted because they made `remove-one-1k` worse:

- broad component-level bailout
- keyed single-removal fast path
- a more generic recursive structural-compare rewrite

The surviving change is the flag-driven host-subtree bailout.

### Recommended Next Step

Treat this branch state as the current milestone checkpoint.

If more work is needed before the next milestone, it should focus specifically on keyed removal behavior and surviving-row cost, not on broad new shortcuts or architectural expansion.

## Principles

1. Two-phase rendering is required for correctness

We already have bug classes that cannot be fixed without a real commit phase. In particular, libraries that measure layout or animate in `componentDidUpdate` require neighboring DOM to be current before lifecycle callbacks run.

That means the runtime contract has to become:

- Reconcile the whole update
- Apply all host DOM mutations for the committed tree
- Only then run refs, `componentDidMount`, `componentDidUpdate`, and effects

2. Scope must stay narrow

The old v11 direction likely failed in part because it combined several large changes:

- new rendering semantics
- new runtime object model
- new host ownership primitives
- suspense changes
- forward-looking compiler support

This migration should not do that. Each step should be independently benchmarkable and shippable.

3. Hot path costs must remain explicit

The main performance risks are:

- extra allocations for mutation records
- generic abstraction layers in tight diff loops
- second-pass work that repeats sibling/anchor discovery
- broader branchiness in common element/text updates

The migration must avoid introducing overhead unless a node actually needs deferred work.

## Non-Goals For The First Milestones

These are intentionally out of scope for the first 2-phase milestone:

- a full backing-node redesign
- compiler-emitted blocks
- rewriting Suspense
- making every subtree a comment range
- generalized new runtime objects for all nodes

Those may still happen later, but they should be consumers of the new commit model, not prerequisites for it.

## Target Runtime Contract

For a single committed update:

1. Reconcile computes the next tree and records host work.
2. Commit applies all host mutations that can affect observable DOM structure or attributes.
3. Refs are attached against the final DOM.
4. Lifecycle callbacks run after DOM is globally stable for that commit.

The critical property is this:

No component lifecycle should observe sibling DOM from an earlier state within the same commit.

## Stage 1: Extract Placement Planning

Files primarily involved:

- [src/diff/children.js](/Users/marvinhagemeister/dev/github/preact-2/src/diff/children.js)
- [src/component.js](/Users/marvinhagemeister/dev/github/preact-2/src/component.js)

Today `diffChildren()` both decides what should happen and performs DOM placement immediately.

The first step is to split that logic into:

- child matching and ordering
- host mutation execution

This should be a refactor only. Behavior should remain the same.

### Desired output of Stage 1

After reconciliation of children, the parent vnode should contain enough information to later perform:

- insertions
- removals
- moves
- next sibling anchor lookup

This data should live on existing vnodes or parent-owned arrays, not in heap-heavy mutation objects.

### Constraints

- keep the existing keyed diffing strategy
- do not add per-mutation allocations on the hot path
- do not change lifecycle timing yet
- benchmark this as a no-op refactor

## Stage 2: Introduce A Real Commit Phase

Files primarily involved:

- [src/diff/index.js](/Users/marvinhagemeister/dev/github/preact-2/src/diff/index.js)
- [src/diff/children.js](/Users/marvinhagemeister/dev/github/preact-2/src/diff/children.js)
- [src/render.js](/Users/marvinhagemeister/dev/github/preact-2/src/render.js)
- [src/component.js](/Users/marvinhagemeister/dev/github/preact-2/src/component.js)

This is the first semantic milestone.

Reconcile should stop mutating the DOM directly. Instead it should compute and record:

- child placement work
- node dirty flags
- pending prop updates
- ref changes
- lifecycle/effect queues

Then `commitRoot()` should:

1. walk the committed tree
2. flush host mutations
3. flush refs
4. flush lifecycle callbacks

### Minimum required deferral

The minimum set of work that must move to commit for correctness is:

- insertions
- removals
- moves
- ref attachment
- lifecycle/effect flushing

Prop updates should also move if they are necessary to satisfy the final DOM observability contract. The implementation can start conservatively and then narrow or widen based on correctness and benchmarks.

### Success criteria

- `componentDidUpdate` never runs against partially updated sibling DOM
- existing behavior remains intact outside timing fixes
- benchmark impact is measured before moving to later stages

## Stage 3: Formalize Comment-Range Ownership

Files primarily involved:

- [src/util.js](/Users/marvinhagemeister/dev/github/preact-2/src/util.js)
- [src/render.js](/Users/marvinhagemeister/dev/github/preact-2/src/render.js)
- [src/diff/index.js](/Users/marvinhagemeister/dev/github/preact-2/src/diff/index.js)

The repo already has the beginnings of marker-range support:

- `claimRange()`
- `createRange()`
- `removeRange()`
- `collectRange()`
- `hydrateRange()`

Once a real commit phase exists, ranges should become a formal host primitive for cases where single-node ownership is insufficient:

- selective hydration
- raw HTML regions that should be preserved or hydrated later
- suspense boundaries
- multi-node fragment ownership

This should not imply that every node becomes a range. Ordinary element and text nodes should remain as cheap as possible.

### Success criteria

- range-based hydration becomes a first-class supported pattern
- range-owned regions work with the new commit ordering
- no universal range wrapper is introduced for normal DOM nodes

## Stage 4: Rebuild Suspense On Top Of The Commit Model

Do not attempt this before Stage 2 is proven.

Suspense should be re-evaluated only after:

- commit ordering is correct
- range ownership is formalized
- mutation timing is benchmarked and stable

At that point Suspense can be rebuilt around:

- deferred commit ordering
- stable subtree ownership
- range-based content boundaries

This is where any frozen-subtree or detached-content ideas should be revisited. They should not shape the initial 2-phase migration.

## Stage 5: Add Compiler Blocks As A Consumer

Compiled templates should be treated as a later consumer of the runtime, not part of the initial rewrite.

The compiler goal is still important:

- identify static structure
- replace vnode overhead in static regions
- emit direct DOM patching for dynamic expressions
- interoperate with JSX and normal component boundaries

But the runtime work needed for that should build on the already-proven commit pipeline:

- same child reconciliation contract
- same commit ordering contract
- same range ownership primitive where needed

This ensures compiled blocks are an optimization and capability extension, not a reason to accept a slower baseline runtime.

## Performance Guardrails

Every stage should be evaluated against explicit constraints:

1. No per-mutation object allocation in the hot path
2. No universal wrapper node around ordinary DOM elements
3. No duplicate child representation unless benchmarked and justified
4. No second-pass recomputation of expensive sibling placement metadata where it can be cached cheaply
5. No compiler-related runtime overhead in the first 2-phase milestone

The benchmark discipline should be:

- benchmark after each internal step
- compare against current v10-style behavior
- include child reorders, keyed updates, large lists, and common element/text updates
- treat regressions as blockers, not cleanup work for later

## Recommended Order Of Execution

1. Refactor `diffChildren()` so planning and DOM execution are separable.
2. Store placement and dirty information on existing vnodes or compact parent-owned structures.
3. Add a commit tree walk that flushes host mutations before refs and lifecycles.
4. Validate the lifecycle ordering fix with targeted regression tests.
5. Benchmark and reduce overhead until the new commit model is acceptable.
6. Formalize comment-range ownership on top of the new commit model.
7. Revisit Suspense.
8. Add compiler-oriented blocks only after the runtime model is stable.

## What This Plan Optimizes For

This plan is intentionally biased toward:

- fixing correctness bugs first
- reducing architectural risk
- keeping performance work measurable
- preserving a clean future path to ranges and compiled templates

It does not try to fully describe the end-state architecture. It describes the safest path from the current runtime to a correct 2-phase model.
