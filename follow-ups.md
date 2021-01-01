# Follow ups

## TODOs

* Combine placeChild and unmounting loop?? Do placeChild backwards? Do
  unmounting first then placeChild loop
* Remove the need for `excessDomChildren`. Do hydration more similarly to
  `keyed` if possible.
* Consider further removing _dom pointers from non-dom VNodes

## Other

* `[MAJOR]` Remove select `<option>` IE11 fix in diffChildren and tell users to
  always specify a value attribute for `<option>`. History:
  https://github.com/preactjs/preact/pull/1838
* One possible implementation for effect queues: Internal nodes can have a local
  queue of effects for that node while a global queue contains the internal
  nodes that have effects.
* Feature: Top-level render handles Fragment root
* Figure out a way to externally support the use case of "start rendering at
  this child of parentDom" (in other words, remove all that code from core &
  recommend folks use
  [this technique](https://gist.github.com/developit/f321a9ef092ad39f54f8d7c8f99eb29a))
* Golf everything! Look for @TODO(golf)
* Look for ways to optimize DOM element diffing, specifically how we diff props
	- Investigate diffing props before or after children
  - Investigate inlining the loops in diffProps to capture special props
    (dangerouslySetInnerHTML, value, checked, multiple)
* Revisit all replaceNode tests
	- Top-level `render()` no longer accepts a `replaceNode` argument, and does not removed unmatched DOM nodes
