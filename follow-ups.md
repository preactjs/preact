# Follow ups

## DONE

- `[MAJOR]` Deprecated `component.base`
- `[MAJOR]` Remove `replaceNode`, [use this technique instead](https://gist.github.com/developit/f321a9ef092ad39f54f8d7c8f99eb29a))
- `[MAJOR]` Removed select `<option>` fix for IE11, using select in IE11 will always require you to specify a `value` attribute
- `[MAJOR]` Removed automatic suffixing of `px` to dimensional style attributes
- `[MAJOR]` Forward ref by default on functional components (this is not the case for compat)
- `[MINOR]` Add truely controlled components
- `[MINOR]` Add `createRoot` API

## To verify

PR's that weren't backported yet, do they work?

- Verify with sandbox https://github.com/preactjs/preact/pull/3210
- I don't know how to test this yet https://github.com/preactjs/preact/pull/3260
- Verify in browser https://github.com/preactjs/preact/pull/3226
- https://github.com/preactjs/preact/pull/3280 Not merged yet need some input
- https://github.com/preactjs/preact/pull/3222 Same as above
- Make this work https://github.com/preactjs/preact/pull/3306


## Root node follow ups

- Investigate if the return value of `createRoot()` can be re-used as a root Node...
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

- Address many TODOs
- Move refs to internal renderCallbacks
- Rewrite rerender loop to operate on internals, not components
- Rewrite commit loop to operate on internals not components
- rewrite hooks to operate on internals?
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

- Logic to begin (re)rendering an internal is sorta scattered around (top level
  render/hydrate, rerenderComponent, diffChildren), particularly the logic to
  resume suspended hydration. Could we consolidate this logic into a single
  function?

  Perhaps reuse this function in the new extensible Component API?

## Other

- One possible implementation for effect queues: Internal nodes can have a local
  queue of effects for that node while a global queue contains the internal
  nodes that have effects.
- Feature: Top-level render handles Fragment root
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
