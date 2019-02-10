# Changelog

## Differences from Preact

### Major changes

1. The VNode shape has changed
    1. `attributes` has been renamed to `props`
    2. `nodeName` is now `type`
    3. `props.children`
        1. The children of a VNode are no longer guaranteed to be a flat array. It could be `undefined`
           or it could be a nested array of children. use newly exported helper `toChildArray` to
           always get an array back. It takes `props.children` as an argument and always returns an array
        2. A Component with no children will not have a `children` prop defined on `props`. Preact v8
           guaranteed an empty list would always be there. That can no longer be relied on.
        3. `children` is only stored as a property on the `props` property (i.e. `props.children`).
           `vnode.children` no longer exists
        4. `null`, `undefined`, `true`, and `false` are not removed from the children array stored as
		      props. Use the newly exported helper `toChildArray` to flatten and remove non-renderables.
2. `h` has been renamed to `createElement`. To continue to use `h`, alias `createElement` to `h` in
   your import statement to h: `import { createElement as h } from 'preact';`.
3. The root `render` function (the one you import from `preact`) has changed:
    1. `render` no longer returns the newly created DOM element. Its return type is now `void`
    2. `render` no longer supports a third argument to hydrate the DOM. Use the new `hydrate`
       function to hydrate a server rendered DOM tree
    3. Calling `render` multiple times on the same element merges the trees together. It no longer
       just appends to the DOM
    4. Preact no longer guarantees elements not created by Preact will preserved
4. `setState` no longer modifies `this.state` synchronously
5. Falsy attributes values are no longer removed from the DOM. For some attributes (e.g. `spellcheck`)
   the values `false` and `''` have different meaning so being able to render `false` is important
6. The Component constructor no longer initializes state to an empty object. If state has not been
   previously set, it will be set to an empty object the first time the component is rendered, after
   the constructor has been called
7. We no longer have a default export. Use `import * as preact from "preact"` for similar behavior.
8. `options.debounceRendering` has been moved to `Component.debounce`

### Minor changes

1. `addEventListener` and `removeEventListner` are called every time an event handler is changed
2. `render(null, container)` no longer renders an empty text node but instead renders nothing
3. We longer support a synchronous `Component.debounce` (formerly `options.debounceRendering`).
   The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
	important that contributors to Preact can consistenly reason about what calls to `setState`, etc.
	do, and when their effects will be applied. See the links below for some further reading on designing
	asynchronous APIs.
		* [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
		* [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)

### For contributors

1. `scratch.innerHTML = ''` no longer is an effective technique to clear the DOM during testing. If you think you need to
   clear the DOM during a test, consider breaking your tests into multiple individual tests to cover your feature.
