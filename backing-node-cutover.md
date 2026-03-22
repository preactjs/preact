# Backing Node Cutover Plan

This document describes the next major runtime refactor:

- `VNode` becomes descriptor-only
- `BackingNode` becomes the only mounted storage
- planner and commit consume backing nodes, not vnode-mounted state

This is intentionally not an incremental bridge plan. The current mixed model
already proved that partial migration creates two sources of truth and causes
regressions.

Use this document as the implementation plan for the next architectural cutover.

## Why A Cutover Is Needed

The current bridge state has both:

- descriptor state on `VNode`
- mounted state mirrored on `BackingNode`

That means the runtime has to keep syncing:

- child lists
- `_dom`
- `_lastDom`
- `_anchorDom`
- active vs parked subtree ownership

This is unstable by design. Every partial migration requires keeping vnode and
backing state in sync, which is exactly where the regressions are coming from.

The correct next move is to eliminate dual ownership instead of adding more
bridge code.

## Architectural Boundary

After the cutover:

### `VNode`

`VNode` is only the render descriptor for the current pass.

It should contain:

- `type`
- `props`
- `key`
- `ref`
- descriptor-side flags
- a temporary link to the matched backing node during diff

It should not be the source of truth for mounted state.

### `BackingNode`

`BackingNode` is the persistent mounted record.

It should contain:

- `_kind`
- `_parent`
- `_children`
- `_vnode`
- `_component`
- `_firstDom`
- `_lastDom`
- `_anchorDom`
- mounted flags / pending commit flags

Later, for Suspense:

- `_activeChild`
- `_parkedChild`
- `_fallbackChild`

Mounted ownership lives here and only here.

## Core Invariants

These invariants should hold after the cutover:

1. The current mounted child list for a subtree lives on `backing._children`.
2. The current mounted DOM ownership for a subtree lives on:
   - `backing._firstDom`
   - `backing._lastDom`
   - `backing._anchorDom`
3. `backing._vnode` is the current descriptor for that mounted subtree.
4. `vnode._backing` is only a matching/link convenience during diff.
5. Parent traversal, sibling traversal, placement planning, and commit all use backing-owned state.
6. `vnode._children`, `vnode._dom`, `vnode._lastDom`, and `vnode._anchorDom` are no longer authoritative mounted storage.

## Scope

The first cutover scope is core runtime only.

Included:

- DOM elements
- text nodes
- Fragments
- component subtree roots
- keyed and unkeyed child diff
- host journal
- refs and lifecycle ordering

Explicitly deferred until core is stable again:

- compat Suspense correctness
- Suspense hydration
- parked/original subtree ownership for Suspense
- compiler blocks

The goal is to get all core tests green on a backing-first runtime before
porting compat features onto it.

## Cutover Strategy

This should be executed as one coherent refactor branch, not as tiny
independent micro-steps.

The work is still phased, but each phase should preserve one clear source of
truth rather than keeping the mixed vnode/backing model alive longer.

## Phase 1: Make Backing Nodes The Only Mounted Storage

### Goal

Stop treating vnode fields as mounted truth.

### Changes

1. Keep `vnode._backing` only as a diff-time link.
2. Make `backing._vnode` authoritative for the current descriptor.
3. Make all range helpers read and write backing-owned fields only.
4. Move owned child storage fully to `backing._children`.
5. Treat vnode DOM/child fields as compatibility mirrors at most.

### Implementation notes

- Introduce explicit helpers in `src/backing.js`:
  - `getCurrentBacking(vnode)`
  - `getBackingChildren(backing)`
  - `setBackingChildren(backing, children)`
  - `getBackingFirstDom(backing)`
  - `getBackingLastDom(backing)`
  - `getBackingAnchorDom(backing)`
  - `setBackingRange(backing, firstDom, lastDom, anchorDom)`
- Update `src/range.js` to operate on backing nodes directly.
- Remove code that treats `vnode._children` or `vnode._dom` as the mounted source of truth.

### Exit criteria

- Core traversal no longer depends on raw vnode-mounted fields.
- Parent range recomputation reads only backing-owned children.
- No code path needs vnode/backing child-array syncing to stay correct.

## Phase 2: Make Child Diff Produce Backing Children

### Goal

`diffChildren()` should stop producing a mounted vnode child array.

### Changes

1. Descriptor children remain render-time input only.
2. Child matching produces a mounted child list on the parent backing node.
3. Matching happens as:
   - descriptor child -> matched old backing child
   - or create new backing child
4. Removed children are old backing children marked for unmount/removal.

### Consequences

- The planner works on backing children, not vnode children.
- Parent replacement paths update `backing._children`, not `parentVNode._children`.
- Unkeyed slot-by-slot semantics become simpler because the mounted list is no
  longer conflated with descriptor children.

### Data model

For core shapes, the mounted child list should become:

- host backing children for element/text descendants where needed
- backing nodes for Fragment/component roots

If host nodes are not promoted to full backing nodes yet, then Phase 2 may use a
mixed mounted child list internally, but planner APIs should still speak in
terms of mounted children rather than vnode descriptor arrays.

### Exit criteria

- `diffChildren()` returns/publishes backing-owned mounted children.
- Parent ownership updates no longer rely on `newVNode._children`.
- Core keyed/unkeyed tests are green with backing-first child storage.

## Phase 3: Move Planner To Backing-Owned Sibling Records

### Goal

Placement planning must consume backing-owned sibling state only.

### Changes

1. Build the sibling plan from backing children in final order.
2. Each sibling plan entry records:
   - mounted child/backing
   - status: retain / insert / move / remove
   - `firstDom`
   - `lastDom`
   - `anchorDom`
3. Resolve symbolic sibling anchors from backing-owned ranges.
4. Enqueue host ops from this plan.

### Important rule

Planner inputs must not be derived from incidental vnode DOM fields or old live
DOM adjacency.

### Exit criteria

- `planPlacements()` consumes backing-owned sibling records.
- Host ops no longer depend on vnode `_dom/_children` as planning inputs.
- Fragment/rootless placement behavior is expressed in terms of backing-owned ranges.

## Phase 4: Make Commit Fully Backing-Driven

### Goal

Commit should flush host work and lifecycle/ref queues using backing-owned
mounted data only.

### Changes

1. Host journal stores targets tied to backing-owned DOM ranges.
2. Ref/lifecycle queues attach to backing/component ownership, not descriptor mutation side effects.
3. Parent update paths replace old backing children with new backing children before commit flush.
4. Unmount/removal consumes old backing children, not stale vnode graphs.

### Exit criteria

- Commit no longer needs vnode-mounted storage to flush host work.
- Core lifecycle ordering stays correct.
- `componentDidUpdate` still observes globally stable sibling DOM.

## Phase 5: Reintroduce Compat Features On Top

After core is stable:

1. Rebuild Fragment edge cases on the backing-first planner.
2. Rebuild Suspense boundary ownership using:
   - visible child backing
   - parked child backing
   - fallback child backing
3. Rebuild Suspense hydration on top of the same mounted ownership model.

Suspense should not be fixed on the mixed vnode/backing model anymore.

## File-Level Refactor Plan

### `src/backing.js`

This becomes the main mounted-storage API.

Responsibilities:

- create/reuse backing nodes
- attach current descriptor
- read/write owned children
- read/write range ownership
- expose parent/child traversal helpers

It should stop being a thin sync helper and become the mounted storage layer.

### `src/range.js`

This becomes backing-first.

Responsibilities:

- range reads from backing
- range recomputation from backing children
- anchor-surface reads from backing

It should no longer treat vnode fields as the mounted source of truth.

### `src/diff/children.js`

This becomes the mounted-child builder and planner front-end.

Responsibilities:

- normalize descriptor children
- match descriptors to old mounted children
- build new mounted child list
- classify retain/insert/move/remove
- feed backing-owned sibling records into the planner

It should stop mutating vnode child arrays as if they were mounted storage.

### `src/diff/index.js`

This becomes the mounted-node reconciler and host-op enqueuer.

Responsibilities:

- match descriptor to backing
- update backing-owned range after recurse
- enqueue host ops
- keep vnode fields as descriptor-side outputs only if still needed for compatibility

### `src/component.js`

This becomes a backing-aware component/update driver.

Responsibilities:

- replace mounted child/backing in the parent on rerender
- compute parent DOM sibling/range through backing-owned children
- stop updating parent vnode child arrays as the source of truth

## Things To Delete

The cutover should remove these patterns from core code:

- vnode/backing child-list syncing as a correctness mechanism
- treating `vnode._children` as the mounted child source of truth
- treating `vnode._dom` and friends as the mounted ownership source of truth
- planner logic derived from descriptor arrays after mounted matching has completed
- bridge code that copies mounted ownership back onto descriptors just so later stages can read it

## Expected Disruption

This is a large refactor and should be expected to temporarily break:

- Fragment behavior
- parent replacement paths
- hydration
- compat Suspense

That is acceptable during the cutover branch.

What is not acceptable is ending the branch with a mixed model again.

## Success Criteria

The cutover is successful when all of the following are true:

1. Core tests pass on a backing-first runtime.
2. Mounted child/range ownership is stored only on backing nodes.
3. Planner and commit no longer depend on vnode-mounted state.
4. The runtime no longer needs vnode/backing sync glue for core correctness.
5. Compat features can be ported on top of the new model instead of forcing the old model to survive.

## Immediate Next Step

Do not continue with more tiny bridge changes.

Start the cutover with Phase 1 and Phase 2 together:

1. make backing child/range ownership authoritative
2. make `diffChildren()` produce backing-owned mounted children
3. accept temporary broader test breakage during the branch
4. restore core tests on the new model before touching compat Suspense again
