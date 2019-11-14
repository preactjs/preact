# Tree shaking in compat TODO

## Classes

### The problem

In order to enable tree-shaking, we need to transform our classes into a tree-shakeable form.

If a class doesn't use inheritance, then the standard prototype assignments should be tree-shakeable. However classes that inherit (or manually inherit using `Suspense.prototype = new Component()`) are not tree-shakeable by default. BabelJS compiles classes into function closures with a `/*#__PURE__*/` comment informing tree-shakers that this closure can be safely removed if unused.

However for Preact, since we bundle our code output, rollup sees these classes as used (because they are exported) and terser minifies the output and removes the comments. This means our classes don't get compiled away if a consumer of Preact doesn't use them because of the lack of a `/*#__PURE__*/` comment.

### Possible solutions

One option is to modify terser to add a new option to keep `/*#__PURE__*/` comments in source (probably pretty difficult...).

Another idea would be to manually code the classes to be tree-shakeable and not use inheritance.

Some code I tried out:

```js
// portals.js
var ContextProvider = function ContextProvider() {};
ContextProvider.prototype.getChildContext = function getChildContext() {
	return this.props.context;
};
ContextProvider.prototype.render = function render(props) {
	return props.children;
};
```

```js
// PureComponent.js
export function PureComponent() {
	this.isPureReactComponent = true;
}
PureComponent.prototype.shouldComponentUpdate = function(props, state) {
	return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
};
```

```js
// suspense.js

// Comment out the following line to remove a side-effect
// Suspense.prototype = new Component();
```

```js
// suspense-list.js

// Comment out the following line to remove a side-effect
// SuspenseList.prototype = new Component();
```
