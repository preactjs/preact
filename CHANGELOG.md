# Changelog

## Differences from Preact

### Major changes

1. `h` has been renamed to `createElement`
2. The VNode shape has changed
	1. The children of a VNode are no longer normalized `h` and could be a nested array of children.
	2. `attributes` has been renamed to `props`
	3. `nodeName` is now `tag`
	4. `children` is now only stored as a property on `props`: `props.children`
3. `render` no longer returns the newly created DOM element. Its return type is now `void`
4. Use the new `hydrate` to function to hydrate a server rendered DOM tree
5. Setting the DOM `style` attribute to a string is not supported
6. `setState` no longer modifies `this.state` synchronously

### Minor changes

1. `addEventListener` and `removeEventListner` are called everytime an event handler is changed
2. `render(null, container)` no longer renders an empty text node but instead renders nothing

### For contributors

1. `scratch.innerHTML = ''` no longer is an effective technique to clear the DOM during testing. If you thin you need to
   clear the DOM during a test, consider breaking your tests into multiple individual tests to cover your function.
