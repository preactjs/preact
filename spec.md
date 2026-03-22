# Preact Next Architecture Spec

This document describes the intended destination architecture for a future Preact runtime.

It is intentionally separate from [migration.md](/Users/marvinhagemeister/dev/github/preact-2/migration.md):

- `spec.md` describes the target runtime model and capabilities
- `migration.md` describes the staged path from the current implementation

## Goals

1. A real 2-phase render model

Reconcile and commit must be separate phases. No lifecycle should observe partially updated sibling DOM from the same commit.

2. A fast default JSX runtime

The baseline runtime must remain competitive with v10-class performance. New correctness guarantees cannot come with unbounded hot-path overhead.

3. First-class range ownership

The runtime must support DOM ownership between comment markers for selective hydration, raw HTML regions, Suspense-style boundaries, and other multi-node regions.

4. A future path for compiled templates

The runtime should support compiler-emitted blocks that bypass vnode overhead in static regions while interoperating with normal JSX components.

## Core Runtime Contract

For a single committed update:

1. Reconcile computes the next tree and records host work.
2. Commit applies all DOM mutations for the committed tree.
3. Refs are attached against the final DOM.
4. Lifecycle callbacks and effects run only after DOM is globally stable for that commit.

The key guarantee is:

`componentDidUpdate` must never run while neighboring DOM is still in an earlier state from the same update.

This is the main correctness requirement behind the architectural shift.

## Two-Phase Rendering

### Reconcile

Reconcile walks the input tree and determines what work must happen.

It is responsible for:

- matching old and new children
- deciding inserts, removals, and moves
- determining which nodes are dirty
- preparing ref changes
- collecting lifecycle/effect work

It should avoid mutating live DOM directly.

### Commit

Commit walks the committed tree and flushes recorded host work.

It is responsible for:

- applying node creation and placement
- applying removals
- applying prop and text updates
- attaching refs
- running lifecycle callbacks and effects after host work completes

The runtime may choose compact internal representations for pending work, but the commit boundary must be real.

## Host Ownership

The runtime needs two ownership shapes:

- single-node ownership for ordinary element and text nodes
- range ownership for multi-node regions

Range ownership is represented by paired comment markers:

- `<!--$id-->`
- `<!--/$id-->`

with the start marker holding a reference to the end marker.

### Range Operations

Useful primitive operations include:

- `claimRange(excessDomChildren, id)`
- `createRange(parentDom, before, id)`
- `removeRange(start, end)`
- `clearRange(startMarker)`
- `appendToRange(startMarker, html)`
- `collectRange(startMarker)`

These operations already map well to selective hydration and marker-based DOM ownership.

### Important constraint

Not every subtree should become a range by default.

Ordinary element and text ownership should stay as cheap as possible. Range ownership should be used only where multi-node stability or external ownership boundaries are required.

## Child Reconciliation

The current keyed matching logic is valuable and should remain the basis for the next architecture.

What changes is not the existence of child diffing, but its output:

- today child reconciliation both plans and mutates
- in the target model child reconciliation plans first, then commit mutates

That means the runtime needs a compact way to represent:

- inserts
- removals
- moves
- anchors or sibling placement information

without turning the hot path into an allocation-heavy mutation queue.

## Comment Ranges As A First-Class Primitive

Range ownership should support at least these cases:

- selective hydration
- raw HTML regions that should be preserved or hydrated later
- multi-node fragment ownership
- streaming insertion between stable markers
- Suspense-style content boundaries

The existing range helpers and `hydrateRange()` are a strong starting point for this.

## Compiled Templates

Compiled templates are an important part of the long-term direction, but they should be consumers of the runtime model rather than drivers of the initial migration.

The compiler should be able to:

- detect static DOM structure
- emit direct DOM patching for dynamic expressions
- treat control flow boundaries as block boundaries
- interoperate with normal JSX components and lists

### Block model

A compiler-emitted block should fit into the same runtime contract as JSX-backed subtrees:

- reconcile phase updates internal state and child plans
- commit phase applies DOM writes
- child boundaries integrate with the same placement and range primitives

The runtime should not require a second renderer for blocks. Blocks should plug into the same commit ordering guarantees.

## Suspense And Hidden Subtrees

Suspense should eventually build on top of:

- a real commit phase
- stable subtree ownership
- range-based boundaries where needed

The important architectural idea is that Suspense should stop depending on ad hoc vnode rewriting and DOM preservation hacks. It should be modeled as controlled subtree ownership and commit ordering.

This spec does not require the initial 2-phase implementation to solve Suspense immediately. It only defines the target shape that makes that redesign possible.

## Performance Requirements

The target architecture has to preserve a fast common path.

The main performance constraints are:

1. No per-mutation heap allocation in the hot path unless justified by benchmarks.
2. No universal wrapper around ordinary DOM nodes.
3. No broad generic abstraction penalty in the common element/text paths.
4. No second-pass recomputation of expensive sibling placement data where compact cached state is sufficient.

The presence of a commit phase is acceptable only if its real measured cost remains small relative to full render cost.

## Relationship To Migration

This spec describes the desired runtime semantics and capability boundaries.

It does not prescribe the order in which they must land. The staged rollout lives in [migration.md](/Users/marvinhagemeister/dev/github/preact-2/migration.md).

That separation is intentional:

- the architecture should stay stable even if the migration plan changes
- the migration plan should be free to stay conservative and performance-driven
