# Follow ups

## DONE

- `[MAJOR]` Deprecated `component.base`

## Root node follow ups

- Add specific tests for root nodes
  - initial mount with same/different parentDOM as parent
  - mounting on rerender with same/different parentDOM as parent
  - diffing with same/different parentDOM as parent (inert portal node & normal portal node)
  - diffing and switching between same <-> different
  - toggling siblings to root nodes with same/different parentDOM
  - Ensure interesting sibling/children patterns
    - text children and text siblings
    - dom children and dom siblings
    - null children and null siblings
    - multiple Fragment children & multiple Fragment siblings
  - Check out portals.test.js for inspiration

## Backing Node follow ups

- Revisit `prevDom` code path for null placeholders
- Address many TODOs
- Move refs to internal renderCallbacks
- Rewrite rerender loop to operate on internals, not components
- Rewrite commit loop to operate on internals not components
- rewrite hooks to operate on internals?
- Always assign a number to `_vnodeId` (not null, use 0 to clear?)
- Consider converting Fragment (and other special nodes, e.g. root, Portal,
  context?) to be numbers instead of functions with special diff handling

  One benefit of using numbers for Roots/Portals is that a portal could be
  created with a `null` \_parentDOM prop and still be marked as a root type.
  Particularly, this is useful for Suspense and would remove the need for the
  call to `getParentDom` in `Suspense.render`
  
  With the above suggestion, remember to update getParentDom, getDomSibling,
  etc. to handle a `null` `_parentDom`

## Suspense follow ups

- Consider simply rerendering all Suspense children when one of its Promises
  resolves. Might simplify the suspense tracking by avoiding the need to track
  pendingSuspensionCount and suspenders list.

  With the approach above, consider maybe syncing unsuspending on the
  "nextFrame" to gather all Promises that resolved in this microtask/frame and
  rerendering them in one pass

## Child diffing investigations

- Reduce allocations for text nodes
- Investigate skip-index tracking instead of while loop
- Loop multiple times - recursive diff, unmount children, place child
- Combine placeChild and unmounting loop?? Do placeChild backwards? Do
  unmounting first then placeChild loop
- Explore replacing children in `internal._children` as we diff instead of
  building up a new array each time

## TODOs

- Consider further removing `_dom` pointers from non-dom VNodes
  - Ensure all tree traversal functions handle root nodes with different
    parentDOM. For example, getChildDom & getDomSibling should skip over root
    nodes iif they have different parentDOMs.
  - Remove TYPE_ROOT special handling in mountChildren/diffChildren related to
    skipping set \_dom on parent Internals through Portal/root nodes
- Fix Suspense tests:
  - "should correctly render nested Suspense components without intermediate DOM #2747"
- Fix Suspense hydration tests:
  - "should hydrate lazy components through components using shouldComponentUpdate"
- Rebuild Suspense List to work with backing tree
- Find a way to avoid re-rendering suspending trees when swapping to fallback (follow-up to #3053)

## Other

- `[MAJOR]` Remove select `<option>` IE11 fix in diffChildren and tell users to
  always specify a value attribute for `<option>`. History:
  https://github.com/preactjs/preact/pull/1838
- One possible implementation for effect queues: Internal nodes can have a local
  queue of effects for that node while a global queue contains the internal
  nodes that have effects.
- Feature: Top-level render handles Fragment root
- Figure out a way to externally support the use case of "start rendering at
  this child of parentDom" (in other words, remove all that code from core &
  recommend folks use
  [this technique](https://gist.github.com/developit/f321a9ef092ad39f54f8d7c8f99eb29a))
- Golf everything! Look for @TODO(golf)
- Look for ways to optimize DOM element diffing, specifically how we diff props
  - Investigate diffing props before or after children
  - Investigate inlining the loops in diffProps to capture special props
    (dangerouslySetInnerHTML, value, checked, multiple)
- Revisit all replaceNode tests
  - Top-level `render()` no longer accepts a `replaceNode` argument, and does not removed unmatched DOM nodes

## Thoughts on Suspense

- Use a special VNode (e.g. Root node) that reparents all children into a new
  DOM node (like Portals). Currently suspense manually does this but I think it
  is buggy in that it doesn't properly reset all dom pointers we currently
  maintain (implemented in #3053)
- Need a way to trigger updates on VNodes that may need mounting or patching.
  I'm thinking backing nodes will help here so when a node suspends, we can
  maintain its suspended state on the backing node and not the component which
  may need to be nulled or remounted (i.e. constructor & lifecycles called
  again) (re: the bug about calling forceUpdate on a suspended hydration
  component)
- Maintain the state (i.e. whether or not a node's last render suspended) as a
  flag on the VNode. This flag would be useful for commit or unmount option
  hooks to discover that that a suspended node has successfully rerendered or
  unmounted. Once that is detected the nearest Suspense node that is waiting can
  be updated as such (no more overriding render or componentWillUnmount!)
