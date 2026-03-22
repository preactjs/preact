# Preact Runtime Architecture

This document describes the intended end-state runtime model for a future Preact.

It is more concrete than [spec.md](/Users/marvinhagemeister/dev/github/preact-2/spec.md) and less migration-oriented than [migration.md](/Users/marvinhagemeister/dev/github/preact-2/migration.md).

Use this document as the engineering target when evaluating refactors, not as a staged rollout plan.

## Goals

The runtime should satisfy all of the following:

1. DOM is globally stable before refs and lifecycle callbacks run.
2. Fragment and other rootless subtrees have explicit DOM ownership.
3. Suspense and hydration can preserve, park, and restore subtree ownership without ad hoc DOM hacks.
4. JSX and future compiled blocks can target the same mounted tree model.
5. Common DOM/text paths stay competitive with v10-class performance.

## Core Model

The runtime should conceptually separate two kinds of data:

- descriptors
- instances

### Descriptor

A descriptor is ephemeral. It describes the desired output for a single render pass.

Typical descriptor fields:

- `type`
- `props`
- `key`
- `ref`

Descriptors are produced by:

- JSX
- `createElement()`
- compiler-emitted blocks

Descriptors are input to reconciliation. They are not the ideal place to store long-lived mounted state.

### Instance

An instance is persistent. It represents a mounted subtree that currently exists in the tree.

Typical instance fields:

- `type`
- `key`
- `parent`
- `children`
- `component`
- `firstDom`
- `lastDom`
- flags
- pending ref/lifecycle state
- pending host work state

This is conceptually similar to a stable backing object or fiber, but without implying React's full scheduling model.

The important property is persistence:

- descriptors are recreated per render
- instances survive across renders until unmount

## Subtree Ownership Invariant

Every mounted subtree must satisfy a single ownership invariant:

- if the subtree renders DOM, it owns one contiguous DOM range

That range is represented by:

- `firstDom`
- `lastDom`

In the current codebase these correspond to:

- `_dom`
- `_lastDom`

### Ownership rules

For text and ordinary DOM elements:

- `firstDom === lastDom`

For Fragments, components, Suspense boundaries, and other rootless/multi-node subtrees:

- `firstDom` is the first rendered descendant DOM node
- `lastDom` is the last rendered descendant DOM node

The runtime must be able to rely on this invariant everywhere. It must not be "usually correct".

### Consequences

This implies:

- sibling subtree ranges never overlap
- parent ownership is derived from child ownership in final child order
- remove/move operations act on subtree ranges, not on guessed descendant roots

## Two-Phase Rendering

The runtime must have a real reconcile/commit boundary.

### Reconcile

Reconcile computes the next mounted tree and plans host work.

Responsibilities:

- normalize children
- match old and new children
- recurse into matched subtrees
- classify inserted, retained, moved, and removed children
- compute final subtree ownership ranges
- enqueue host operations
- enqueue refs, lifecycle callbacks, and effect work

Reconcile should not rely on live DOM mutation to discover later anchors.

### Commit

Commit flushes the planned work.

Responsibilities:

1. flush host journal
2. attach refs
3. run lifecycle callbacks and effects

The essential contract is:

No `componentDidMount`, `componentDidUpdate`, ref callback, or effect may observe partially updated sibling DOM from the same commit.

## Child Reconciliation

Child reconciliation should be structured as explicit stages.

### 1. Normalize

Convert raw children into descriptors while preserving the chosen semantic model.

Under the current intended semantics:

- keyed children own identity and may reorder
- unkeyed children are slot-by-slot only

That means:

- unkeyed insertion/removal remounts shifted unkeyed children
- only keyed children participate in reorder planning

### 2. Match

For keyed children:

- match by `key` and compatible `type`

For unkeyed children:

- match by position only

The output of matching is not DOM operations. It is classification:

- retained
- inserted
- removed
- moved

### 3. Recurse

Recurse into retained or inserted children and establish their subtree ownership:

- `firstDom`
- `lastDom`

Removed children do not contribute anchors to the new tree.

### 4. Plan

After child ranges are known, compute final sibling order and placement anchors.

This is the critical step the runtime must get right.

## Placement Planning

Placement must be planned against the final sibling tree, not against incidental live DOM.

For a child `c[i]` that needs placement:

- its `before` anchor is the `firstDom` of the nearest later sibling in final order whose subtree renders DOM
- if no later sibling renders DOM, `before = null`

### Important rule

Removed children are never valid anchors.

That means:

- planning must not depend on DOM that only exists until the removal pass
- commit order must not be used as a hack to make bad anchors work

If a placement plan depends on soon-to-be-removed DOM, the planner is wrong.

### What this fixes

This model is the direct fix for:

- Fragment reorder bugs
- rootless subtree movement bugs
- Suspense sibling-order bugs
- hydration reorders that should be no-ops

## Host Journal

Host work should be recorded in a compact root-local journal.

The journal should be:

- flat
- packed
- transient
- allocation-light

### Suggested op set

- `SET_TEXT(node, value)`
- `INSERT_NODE(node, parent, before)`
- `MOVE_RANGE(first, last, parent, before)`
- `REMOVE_RANGE(first, last)`

Potential future extension:

- `SET_PROP(node, key, value, oldValue)`

### Journal rules

- only enqueue real host work
- do not walk the tree again in commit to rediscover work
- clear consumed entries after commit to avoid retaining DOM references

The intended cost model is:

- reconcile cost scales with diff complexity
- commit cost scales with actual DOM mutations

## Range Helpers

The runtime should centralize range semantics.

At minimum there should be helpers equivalent to:

- `getFirstDom(node)`
- `getLastDom(node)`
- `updateRangeFromChildren(node)`

## Staged Refactor Path

The end state above does not need to land as a single rewrite.

The practical path should be staged around the places where the current vnode
model is already breaking down:

- Fragments
- component subtree roots
- Suspense boundaries
- hydration around those boundaries

### Why Stage The Refactor

Today a vnode is trying to represent both:

- the render descriptor for the current pass
- the mounted subtree that currently owns DOM

Those are often the same for simple DOM updates, but they diverge in exactly the
cases where the runtime is currently weakest:

- a Suspense boundary may describe fallback while the mounted DOM is still the parked primary subtree
- hydration may describe a child tree that has not yet claimed or replaced the mounted DOM
- a Fragment may describe one subtree shape while its mounted ownership is still derived from descendants of an older render

This is why the current code ends up copying fields like:

- `_children`
- `_dom`
- `_lastDom`
- `_anchorDom`

from old vnode objects onto new vnode objects in order to preserve mounted
ownership.

That approach can be stretched only so far. The correct long-term fix is to
introduce persistent mounted ownership records and let vnodes remain
descriptors.

### Stage 1: Mounted Boundary Records

Introduce a persistent mounted record for boundary-like subtree owners first,
without replacing plain host DOM vnodes yet.

Initial boundary kinds:

- Fragment
- component subtree root
- Suspense boundary

The mounted boundary record should own:

- `parent`
- `children`
- `firstDom`
- `lastDom`
- `anchorDom`
- `kind`

For Suspense it should also own:

- `primaryChild`
- `fallbackChild`
- `activeChild`
- `parkedChild`

This stage is intentionally narrow. It avoids a whole-runtime rewrite while
moving the most failure-prone ownership cases onto stable backing records.

### Stage 2: Descriptor To Boundary Matching

Diff should stop treating the new vnode as the mounted owner for these boundary
shapes.

Instead:

1. a new descriptor arrives
2. diff finds or creates the matching mounted boundary record
3. child reconciliation updates the mounted boundary record
4. host ops are planned from the mounted boundary record

At this point:

- vnode remains the render description
- boundary record becomes the truth for mounted DOM ownership

This is the first stage where Suspense can cleanly distinguish:

- what this render is asking for
- what subtree is currently visible
- what subtree is parked but still mounted

### Stage 3: Planning Against Mounted Children

Placement planning should then move from vnode child arrays to mounted child
records.

Planner input becomes:

- mounted sibling records in final order
- per-child status:
  - retain
  - insert
  - move
  - remove
- symbolic sibling anchors between mounted records

Host ops are then derived from mounted ranges:

- `firstDom`
- `lastDom`
- `anchorDom`

This is the point where final-order planning becomes much easier to reason
about, because the planner no longer depends on descriptor objects also serving
as ownership records.

### Stage 4: Full Instance Generalization

Only after boundary ownership is stable should the runtime consider extending
the instance model to ordinary host nodes as well.

That would give a fully uniform mounted tree:

- descriptor input
- persistent mounted node output

But this should be treated as a later cleanup/generalization step, not as a
prerequisite for fixing Fragment and Suspense ownership.

## Initial Mounted Boundary Shape

The first backing record can be minimal.

For example:

```ts
interface BackingNode {
	parent: BackingNode | null;
	vnode: VNode | null;
	children: Array<VNode | BackingNode | null>;
	firstDom: Node | null;
	lastDom: Node | null;
	anchorDom: Node | null;
	kind: BackingKind;
	activeChild?: VNode | BackingNode | null;
	parkedChild?: VNode | BackingNode | null;
	fallbackChild?: VNode | BackingNode | null;
}
```

This is not meant to be the final public or even final internal type. It is a
practical first ownership object for the boundary shapes that already need it.

## Why Boundary Records First

The current unresolved bugs are not evenly distributed across the runtime.

They cluster around:

- rootless multi-node subtree ownership
- Suspense parked vs visible ownership
- hydration preserving mounted DOM that does not match the current descriptor

Those are all boundary problems.

So the best leverage comes from stabilizing boundary ownership first, not from
rewriting every host vnode into a mounted instance immediately.

## Success Criteria For The First Refactor Stage

The first mounted-boundary step is successful if all of the following become
true:

- Fragment ownership no longer depends on copying range fields across vnodes
- Suspense active vs parked vs fallback ownership is explicit
- parent planning consumes mounted boundary ranges rather than inferred vnode ownership
- hydration can keep parked visible content mounted without pretending it is the current descriptor child
- the remaining Fragment/Suspense bugs become localized to boundary logic instead of leaking across `children.js`, `diff/index.js`, and `compat/src/suspense.js`

These helpers should be the only place where parent range derivation is defined.

The runtime should avoid ad hoc `_dom` / `_lastDom` repair logic spread across multiple modules.

## Fragment Model

Fragments should be first-class mounted subtree shapes, not a side effect of array recursion.

A Fragment instance should:

- own a child list
- derive `firstDom` / `lastDom` from those children
- participate in move/remove planning like any other subtree

### State semantics

Fragment state preservation should follow subtree identity and ownership path, not incidental child reuse.

That means:

- preserve when the same mounted subtree shape remains in place
- remount when fragment nesting or ownership path changes in a way that changes identity

This should make Fragment behavior explicit rather than emergent.

## Suspense Model

Suspense should become a boundary instance with explicit subtree ownership.

It may own:

- primary content subtree
- fallback subtree
- parked subtree during suspension or hydration

The active boundary range is whichever subtree is currently attached.

### Suspense requirements

Suspense should support:

- parking a subtree without losing ownership metadata
- restoring a parked subtree without copying only the first DOM node
- hydrating a suspended subtree while preserving the claimed DOM range
- switching between primary and fallback using subtree ranges, not ad hoc `_dom` hacks

### Hydration requirement

Hydrated subtrees must initialize the same ownership metadata as client-created subtrees:

- `firstDom`
- `lastDom`

That is required so hydration planning and client planning use the same rules.

## Host Ownership Beyond Normal DOM

Comment ranges are still a valid host primitive, but they should not be the default shape of all subtrees.

Use explicit comment-marker ranges only where single-node or descendant-derived ownership is insufficient:

- selective hydration boundaries
- preserved raw HTML regions
- streaming insertion boundaries
- explicit marker-owned regions

Ordinary DOM and ordinary Fragments should remain as cheap as possible.

## Bailouts

Bailouts should be based on explicit shape flags and host-output invariants, not on generic recursive child normalization.

Useful flags include:

- has key
- single child
- single text child
- array children
- subtree is single-node vs multi-node
- subtree is host-only vs component-containing

A bailout is valid only if:

- host output shape is known to be unchanged
- props that affect host output are unchanged
- refs/lifecycle semantics remain correct
- subtree ownership range remains valid

## Compiled Blocks

Compiled templates should target the same mounted tree model as JSX.

That means a compiled block should:

- produce descriptors or block-specific descriptors
- reconcile against a persistent instance
- expose subtree ownership like any other mounted subtree
- use the same host journal and commit ordering

The compiler's win should come from:

- skipping vnode allocation in static regions
- emitting direct DOM patch logic for dynamic slots

The compiler should not require a second renderer.

## Non-Goals

This document does not require:

- React-style concurrent scheduling
- universal marker ranges for all nodes
- per-node mutation objects
- preserving historical unkeyed skew semantics

## What Should Disappear

The target architecture should eliminate dependence on:

- `_dom` alone as a summary of subtree ownership
- commit-time anchor rediscovery from live DOM
- ad hoc pointer repair scattered across modules
- fragment behavior emerging from array recursion
- commit-order tricks used to compensate for incorrect planning

## Suggested Module Responsibilities

### `children.js`

Should own:

- child normalization
- matching
- child classification
- final sibling order planning
- anchor computation

Should not own:

- direct structural DOM mutation

### `index.js`

Should own:

- element/text/component diff
- subtree range maintenance for the node being diffed
- host journal enqueueing
- commit flushing

### `component.js`

Should own:

- parent pointer/range repair helpers
- DOM sibling lookup helpers

It should not be where range semantics are redefined ad hoc.

### `compat/src/suspense.js`

Should own:

- Suspense-specific boundary state
- parking/restoration behavior
- hydration boundary behavior

It should not rely on `_dom` as shorthand for an entire subtree.

## Concrete End-State Invariants

The runtime should eventually be able to assert these:

1. Every mounted subtree with DOM has a valid contiguous `[firstDom..lastDom]` range.
2. Every placement anchor refers to a retained or incoming sibling range in final order.
3. No placement anchor depends on removed DOM.
4. Commit never needs to rediscover host operations from the tree.
5. Refs and lifecycles only run after the host journal is fully flushed.

## Recommended Refactor Order

If optimizing for the target architecture instead of incremental patching, the clean order is:

1. centralize range helpers and range invariants
2. refactor child planning around final sibling ranges
3. keep structural work journaled and commit-only
4. make Fragment a first-class mounted subtree shape
5. rebuild Suspense boundary behavior on subtree ranges
6. only then evaluate whether the descriptor/instance split should become explicit in code

## Relationship To Other Docs

- [spec.md](/Users/marvinhagemeister/dev/github/preact-2/spec.md) describes the target runtime at a higher level
- [migration.md](/Users/marvinhagemeister/dev/github/preact-2/migration.md) describes the staged path from the current implementation
- this file defines the engineering target in more operational terms
