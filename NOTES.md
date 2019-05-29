# PR Description

## Summary

* Replace `component._prevVNode` with `vnode._children`
* Combine Fragment and Component diffing

## Details

### Replace `component._prevVNode` with `vnode._children`

Previously, `_children` was a cache for a normalized `props.children`. With a DOM VNode and Fragment VNode, you could access the children of the VNodes on the this `_children` property, but on VNodes for components, you need to go through `vnode._component._preVNode`.

This PR formalizes the concept behind `_children`. It is now the container for the rendered children of all VNodes. If you think of `props.children` as input to render functions, `_children` is the output of the `render`. And DOM VNodes and Fragments are just render functions that return `props.children`. The implementation is a little different (DOM VNodes don't have a render function, per se), but this concept applies.

### Combine Fragment and Component diffing

Previously, if `diff` was called with a Component, it would call `c.render`, coerce the result to a single VNode (e.g. convert arrays to a Fragment), and then call `diff`.  However, building on the `_children` change (and the concept mentioned there), we now instead treat Components as always returning arrays, and coerce result of render into a children of VNodes to continue rendering. So, `diff` always calls `diffChildren` after diff'ing a VNode, regardless of its type. Another way to think about this is that everything is Fragment now :smile:

Being able to depend on `diffChildren` -> `diff` -> `diffChildren` for all VNodes allows us to do operations that require knowing the `parentVNode` in `diffChildren` without having to special case the `diff` -> `diff` situation. For example, there is now only one place where oldVNode matching happens: `diffChildren` (we can remove some code from the top of `diff`). Further, mounting and unmounting DOM only happens in `diffChildren` as well (if unmounting wasn't recursive, we could inline it).

### Future Considerations

With this PR, their are only 2 place `diff` is called: `diffChildren` and `forceUpdate`. If we can change `forceUpdate` to also enter the diff through `diffChildren`, then it is conceivable that we could inline `diff` into `diffChildren` and make our diff a single function! I think this could give us some good byte savings by sharing more local variables and reducing duplicate structures (e.g. have fewer than 5 `try {} catch {}` like we currently do). It may reduce the approachability of our code, but perhaps we can mitigate that with a well-defined sectional comment format to make up for the lost function names. Either way, I think it might be worth an exploration.

### Breaking change

There are some breaking changes in this PR.

* Component refs aren't re-invoked after each render. Preact v8 and v10 both re-invoke component refs on every render. This PR changes that behavior so they are only invoked on initial render, when the ref changes, or on unmount. This new behavior [appears to match React](https://codesandbox.io/s/reinvoking-preact-refs-90oj9).
