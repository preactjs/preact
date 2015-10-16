# Preact

[![npm Version](https://img.shields.io/npm/v/preact.svg)](http://npm.im/preact)
[![travis-ci](https://travis-ci.org/developit/preact.svg)](https://travis-ci.org/developit/preact)

> Name stolen, if found return to jason [at] developit [dot] ca


## Overview

Preact is an attempt to recreate the core value proposition of React (or similar libraries like Mithril) using as little code as possible, with first-class support for ES2015.  Currently the library is around **3kb** (minified & gzipped).

It retains a large amount of compatibility with React, but only the [ES6 Classes] interface.  As one would expect coming from React, Components are simple building blocks for composing a User Interface.


## Demos

- [ESBench](http://esbench.com) is built using Preact.
- [Flickr Browser](http://codepen.io/developit/full/VvMZwK/) (@ CodePen)
- [Animating Text](http://codepen.io/developit/full/LpNOdm/) (@ CodePen)
- [60FPS Rainbow Spiral](http://codepen.io/developit/full/xGoagz/) (@ CodePen)
- [Simple Clock](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/) (@ JSFiddle)
- [Create your Own!](https://jsfiddle.net/developit/rs6zrh5f/embedded/result/) (@ JSFiddle)


## Getting Started

> You don't _have_ to use ES2015 to use Preact... but you should.
>
> I'm going to assume you have some sort of ES2015 build set up using babel and/or webpack/browserify/gulp/grunt/etc.  If you don't, start with [preact-boilerplate].


### Import what you need

The `preact` module provides both named and default exports, so you can either import everything under a namespace of your choosing, or just what you need as locals:

##### Default:

```js
import preact from 'preact';

// Tell Babel to transform JSX into preact.h() calls:
/** @jsx preact.h */
```

##### Named:

```js
import { h, render, Component } from 'preact';

// Tell Babel to transform JSX into h() calls:
/** @jsx h */
```

> Named imports work well for highly structured applications, whereas the default import is quick and never needs to be updated when using different parts of the library.
>
> Instead of declaring the `@jsx` pragma in your code, it's best to configure it globally in a `.babelrc`:
>
> ```
> { "jsxPragma": "h" }
> ```


### Rendering JSX

Out of the box, Preact provides an `h()` function that turns your JSX into Virtual DOM elements _([here's how](http://jasonformat.com/wtf-is-jsx))_. It also provides a `render()` function that creates a DOM tree from that Virtual DOM.

To render some JSX, just import those two functions and use them like so:

```js
import { h, render } from 'preact';

render((
	<div id="foo">
		<span>Hello, world!</span>
		<button onClick={ e => alert("hi!"); }>Click Me</button>
	</div>
), document.body);
```

This should seem pretty straightforward if you've used [hyperscript] or one of its many friends.

Rendering hyperscript with a virtual DOM is pointless, though. We want to render components and have them updated when data changes - that's where the power of virtual DOM diffing shines.


### Components

Preact exports a generic `Component` class, which can be extended to build encapsulated, self-updating pieces of a User Interface.  Components support all of the standard React [lifecycle methods], like `shouldComponentUpdate()` and `componentWillReceiveProps()`.  Providing specific implementations of these methods is the preferred mechanism for controlling _when_ and _how_ components update.

Components also have a `render()` method, but unlike React this method is passed `(props, state)` as arguments. This provides an ergonomic means to destructure `props` and `state` into local variables to be referenced from JSX.

Let's take a look at a very simple `Clock` component, which shows the current time.

```js
import { h, render, Component } from 'preact';

class Clock extends Component {
	render() {
		let time = new Date().toLocaleTimeString();
		return <span>{ time }</span>;
	}
}

// render an instance of Clock into <body>:
render(<Clock />, document.body);
```


That's great. Running this produces the following HTML DOM structure:

```html
<span>10:28:57 PM</span>
```

In order to have the clock's time update every second, we need to know when `<Clock>` gets mounted to the DOM. _If you've used HTML5 Custom Elements, this is similar to the `attachedCallback` and `detachedCallback` lifecycle methods._ Preact invokes the following lifecycle methods if they are defined for a Component:

| Lifecycle method            | When it gets called                              |
|-----------------------------|--------------------------------------------------|
| `componentWillMount`        | before the component gets mounted to the DOM     |
| `componentDidMount`         | after the component gets mounted to the DOM      |
| `componentWillUnmount`      | prior to removal from the DOM                    |
| `componentDidUnmount`       | after removal from the DOM                       |
| `componentWillReceiveProps` | before new props get accepted                    |
| `shouldComponentUpdate`     | before `render()`. Return `false` to skip render |
| `componentWillUpdate`       | before `render()`                                |
| `componentDidUpdate`        | after `render()`                                 |



So, we want to have a 1-second timer start once the Component gets added to the DOM, and stop if it is removed. We'll create the timer and store a reference to it in `componentDidMount`, and stop the timer in `componentWillUnmount`. On each timer tick, we'll update the component's `state` object with a new time value. Doing this will automatically re-render the component.

```js
import { h, render, Component } from 'preact';

class Clock extends Component {
	constructor() {
		super();
		// set initial time:
		this.state.time = Date.now();
	}

	componentDidMount() {
		// update time every second
		this.timer = setInterval(() => {
			this.setState({ time: Date.now() });
		}, 1000);
	}

	componentWillUnmount() {
		// stop when not renderable
		clearInterval(this.timer);
	}

	render(props, state) {
		let time = new Date(state.time).toLocaleTimeString();
		return <span>{ time }</span>;
	}
}

// render an instance of Clock into <body>:
render(<Clock />, document.body);
```

Now we have [a ticking clock](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/)!


### Props & State

The concept (and nomenclature) for `props` and `state` is the same as in React. `props` are passed to a component by defining attributes in JSX, `state` is internal state. Changing either triggers a re-render, though by default Preact re-renders Components asynchronously for `state` changes and synchronously for `props` changes.  You can tell Preact to render `prop` changes asynchronously by setting `options.syncComponentUpdates` to `false`.


## Examples

Here is a somewhat verbose Preact `<Link>` component:

```js
class Link extends Component {
	render(props, state) {
		return <a href={ props.href }>{ props.children }</a>;
	}
}
```

Since this is ES6/ES2015, we can further simplify:

```js
class Link extends Component {
	render({ href, children }) {
		return <a {...{ href, children }} />;
	}
}

// or, for wide-open props support:
class Link extends Component {
	render(props) {
		return <a {...props} />;
	}
}
```


## Extensions

It is likely that some projects based on Preact would wish to extend Component with great new functionality.

Perhaps automatic connection to stores for a Flux-like architecture, or mixed-in context bindings to make it feel more like `React.createClass()`.  Just use ES2015 inheritance:

```js
class BoundComponent extends Component {
	constructor(props) {
		super(props);
		this.bind();
	}
	bind() {
		this.binds = {};
		for (let i in this) {
			this.binds[i] = this[i].bind(this);
		}
	}
}

// example usage
class Link extends BoundComponent {
	click() {
		open(this.href);
	}
	render() {
		let { click } = this.binds;
		return <span onclick={ click }>{ children }</span>;
	}
}
```


The possibilities are pretty endless here. You could even add support for rudimentary mixins:

```js
class MixedComponent extends Component {
	constructor() {
		super();
		(this.mixins || []).forEach( m => Object.assign(this, m) );
	}
}
```


## License

MIT



[ES6 Classes]: https://facebook.github.io/react/docs/reusable-components.html#es6-classes
[hyperscript]: https://github.com/dominictarr/hyperscript
[preact-boilerplate]: https://github.com/developit/preact-boilerplate
[lifecycle methods]: https://facebook.github.io/react/docs/component-specs.html
